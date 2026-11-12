<?php
/**
 * The Review Us page (12 Nov 2026).
 *
 * [llp_review_funnel] draws the star box. 4 or 5 stars sends the customer to the
 * client's Google review page (Client Values, review_url). 1 to 3 stars opens a
 * private form: name, phone, email and what went wrong. The form posts to this
 * plugin, which passes it to Copybot; Copybot emails the client, with a copy to
 * the Local Launchpad team. If Copybot can't be reached the plugin emails both
 * itself, and if that fails too the customer is told it did not send. Nothing a
 * customer types is stored on this site.
 *
 * Also here: [CV: key] tokens in Elementor text and ordinary page text are filled
 * when the page is shown, so the page can say "Thanks for choosing [CV: company_name]".
 *
 * The colours come from the site's Elementor global colours (accent, primary,
 * secondary), so nothing is set per client.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'LLP_REVIEW_FUNNEL_OPTION', 'llp_review_funnel' );
define( 'LLP_REVIEW_FUNNEL_TEAM_EMAIL', 'team@locallaunchpad.co.uk' );
define( 'LLP_REVIEW_FUNNEL_PER_HOUR', 5 );

// ── [CV: key] in Elementor text and ordinary page text ───────────────────────

function llp_review_funnel_fill_tokens( $content ) {
	if ( ! is_string( $content ) || ! llp_copybot_should_resolve() ) {
		return $content;
	}
	return llp_copybot_resolve( $content, 'html' );
}
add_filter( 'elementor/frontend/the_content', 'llp_review_funnel_fill_tokens', 20 );
add_filter( 'the_content', 'llp_review_funnel_fill_tokens', 20 );

// ── Settings: where feedback is sent (Copybot writes this) ───────────────────

/** The Copybot address feedback is passed to, or '' when Copybot has not set it. */
function llp_review_funnel_endpoint() {
	$o = get_option( LLP_REVIEW_FUNNEL_OPTION, array() );
	return is_array( $o ) && ! empty( $o['endpoint'] ) ? (string) $o['endpoint'] : '';
}

/** https only, except a local address (tests). */
function llp_review_funnel_clean_endpoint( $url ) {
	$url = esc_url_raw( trim( (string) $url ) );
	if ( '' === $url ) {
		return '';
	}
	if ( 0 === strpos( $url, 'https://' ) || preg_match( '#^http://(localhost|127\.0\.0\.1)(:\d+)?/#', $url ) ) {
		return $url;
	}
	return '';
}

// ── The form's send ─────────────────────────────────────────────────────────

/** Tidy and check a send. Returns array( 'errors' => string[], 'value' => array ). */
function llp_review_funnel_clean( $in ) {
	$in    = is_array( $in ) ? $in : array();
	$get   = function ( $k ) use ( $in ) {
		return isset( $in[ $k ] ) && is_scalar( $in[ $k ] ) ? (string) $in[ $k ] : '';
	};
	$value = array(
		'stars'    => (int) $get( 'stars' ),
		'name'     => sanitize_text_field( $get( 'name' ) ),
		'phone'    => sanitize_text_field( $get( 'phone' ) ),
		'email'    => sanitize_text_field( $get( 'email' ) ),
		'feedback' => sanitize_textarea_field( $get( 'feedback' ) ),
		'page_url' => esc_url_raw( $get( 'page_url' ) ),
	);
	$errors = array();
	if ( $value['stars'] < 1 || $value['stars'] > 3 ) {
		$errors[] = 'Please tap a star first.';
	}
	if ( '' === $value['feedback'] ) {
		$errors[] = 'Please tell us what went wrong.';
	}
	if ( '' === $value['name'] ) {
		$errors[] = 'Please add your name.';
	}
	if ( '' === $value['phone'] && '' === $value['email'] ) {
		$errors[] = 'Please add a phone number or an email so we can reply.';
	}
	if ( '' !== $value['email'] && ! is_email( $value['email'] ) ) {
		$errors[] = 'That email address does not look right.';
	}
	foreach ( array( 'name' => 120, 'phone' => 40, 'email' => 200, 'feedback' => 4000 ) as $k => $max ) {
		if ( strlen( $value[ $k ] ) > $max ) {
			$errors[] = 'That is too long. Please shorten it.';
			break;
		}
	}
	return array( 'errors' => $errors, 'value' => $value );
}

/** Pass the feedback to Copybot. True when Copybot said it has it. */
function llp_review_funnel_forward( $value ) {
	$endpoint = llp_review_funnel_endpoint();
	if ( '' === $endpoint ) {
		return false;
	}
	$res = wp_remote_post(
		$endpoint,
		array(
			'timeout' => 15,
			'headers' => array( 'Content-Type' => 'application/json' ),
			'body'    => wp_json_encode( $value ),
		)
	);
	if ( is_wp_error( $res ) ) {
		return false;
	}
	$code = (int) wp_remote_retrieve_response_code( $res );
	return $code >= 200 && $code < 300;
}

/** Copybot could not be reached: email the client and the team from this site. */
function llp_review_funnel_mail( $value ) {
	$to = array( LLP_REVIEW_FUNNEL_TEAM_EMAIL );
	if ( is_email( llp_cv( 'email' ) ) ) {
		array_unshift( $to, llp_cv( 'email' ) );
	}
	$stars = $value['stars'] . ' star' . ( 1 === $value['stars'] ? '' : 's' );
	$body  = implode(
		"\n",
		array(
			'A customer used the review card for ' . llp_cv( 'company_name' ) . ' and gave ' . $stars . '. They were not sent to Google: this feedback is private.',
			'',
			'Name: ' . $value['name'],
			'Phone: ' . ( '' !== $value['phone'] ? $value['phone'] : 'not given' ),
			'Email: ' . ( '' !== $value['email'] ? $value['email'] : 'not given' ),
			'',
			'What they said:',
			$value['feedback'],
			'',
			'It is worth getting in touch with them to put it right.',
			'',
			'(Sent by the website itself: Copybot could not be reached.)',
		)
	);
	return (bool) wp_mail( $to, 'A customer left private feedback (' . $stars . ')', $body );
}

/** No more than a handful of sends an hour from one address. */
function llp_review_funnel_allowed() {
	$ip    = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown';
	$key   = 'llp_rf_' . md5( $ip );
	$count = (int) get_transient( $key );
	if ( $count >= LLP_REVIEW_FUNNEL_PER_HOUR ) {
		return false;
	}
	set_transient( $key, $count + 1, 3600 );
	return true;
}

function llp_review_funnel_receive( WP_REST_Request $request ) {
	$in = $request->get_json_params();
	// A filled trap field is a bot: answer as if it worked, send nothing
	if ( is_array( $in ) && ! empty( $in['website'] ) ) {
		return rest_ensure_response( array( 'ok' => true ) );
	}
	$clean = llp_review_funnel_clean( $in );
	if ( $clean['errors'] ) {
		return new WP_Error( 'llp_bad_feedback', $clean['errors'][0], array( 'status' => 400 ) );
	}
	if ( ! llp_review_funnel_allowed() ) {
		return new WP_Error( 'llp_too_many', 'Too many messages from here. Please try again later.', array( 'status' => 429 ) );
	}
	if ( llp_review_funnel_forward( $clean['value'] ) ) {
		return rest_ensure_response( array( 'ok' => true, 'by' => 'copybot' ) );
	}
	if ( llp_review_funnel_mail( $clean['value'] ) ) {
		return rest_ensure_response( array( 'ok' => true, 'by' => 'mail' ) );
	}
	return new WP_Error( 'llp_not_sent', 'Sorry, that did not send.', array( 'status' => 502 ) );
}

add_action(
	'rest_api_init',
	function () {
		$admin = function () {
			return current_user_can( 'manage_options' );
		};
		// The customer's form: open to anyone, as a contact form is
		register_rest_route(
			'llp-copybot/v1',
			'/review-feedback',
			array(
				'methods'             => 'POST',
				'callback'            => 'llp_review_funnel_receive',
				'permission_callback' => '__return_true',
			)
		);
		// Copybot sets where feedback goes
		register_rest_route(
			'llp-copybot/v1',
			'/review-funnel',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => function () {
						return rest_ensure_response( array( 'endpoint' => llp_review_funnel_endpoint() ) );
					},
					'permission_callback' => $admin,
				),
				array(
					'methods'             => 'POST',
					'callback'            => function ( WP_REST_Request $request ) {
						$in = $request->get_json_params();
						if ( ! is_array( $in ) || ! isset( $in['endpoint'] ) ) {
							return new WP_Error( 'llp_bad_body', 'Send { "endpoint": "https://…" }.', array( 'status' => 400 ) );
						}
						$endpoint = llp_review_funnel_clean_endpoint( $in['endpoint'] );
						if ( '' === $endpoint && '' !== trim( (string) $in['endpoint'] ) ) {
							return new WP_Error( 'llp_bad_endpoint', 'The address must start with https://', array( 'status' => 400 ) );
						}
						update_option( LLP_REVIEW_FUNNEL_OPTION, array( 'endpoint' => $endpoint ) );
						return rest_ensure_response( array( 'endpoint' => $endpoint ) );
					},
					'permission_callback' => $admin,
				),
			)
		);
	}
);

// ── [llp_review_funnel]: the star box ───────────────────────────────────────

add_shortcode( 'llp_review_funnel', 'llp_review_funnel_shortcode' );

function llp_review_funnel_shortcode() {
	static $assets = false;
	$review  = esc_url( llp_cv( 'review_url' ) );
	$phone   = llp_cv( 'phone' );
	$privacy = function_exists( 'get_privacy_policy_url' ) ? get_privacy_policy_url() : '';

	$stars = '';
	for ( $i = 1; $i <= 5; $i++ ) {
		$stars .= sprintf( '<button type="button" class="llp-rf-star" data-rating="%1$d" aria-label="%1$d star%2$s">&#9733;</button>', $i, 1 === $i ? '' : 's' );
	}

	$html  = sprintf(
		'<div class="llp-rf" data-llp-rf data-review="%s" data-send="%s" data-phone="%s">',
		esc_attr( $review ),
		esc_attr( esc_url_raw( rest_url( 'llp-copybot/v1/review-feedback' ) ) ),
		esc_attr( $phone )
	);
	$html .= '<div class="llp-rf-step" data-step="rating">'
		. '<h2>How was your experience?</h2><p>Tap a star to let us know.</p>'
		. '<div class="llp-rf-stars" role="group" aria-label="Your rating">' . $stars . '</div>'
		. '<p class="llp-rf-hint">Select your rating above.</p></div>';

	$html .= '<form class="llp-rf-step" data-step="feedback" hidden novalidate>'
		. '<h2>How can we do better?</h2><p>We\'d love to hear how we can improve your experience.</p>'
		. '<label class="llp-rf-label" for="llp-rf-feedback">What could we improve?</label>'
		. '<textarea id="llp-rf-feedback" name="feedback" maxlength="4000" placeholder="Tell us what we could improve..." required></textarea>'
		. '<label class="llp-rf-label" for="llp-rf-name">Your name</label>'
		. '<input id="llp-rf-name" type="text" name="name" maxlength="120" autocomplete="name" required>'
		. '<label class="llp-rf-label" for="llp-rf-phone">Phone</label>'
		. '<input id="llp-rf-phone" type="tel" name="phone" maxlength="40" autocomplete="tel">'
		. '<label class="llp-rf-label" for="llp-rf-email">Email</label>'
		. '<input id="llp-rf-email" type="email" name="email" maxlength="200" autocomplete="email">'
		. '<div class="llp-rf-trap" aria-hidden="true"><label for="llp-rf-website">Website</label><input id="llp-rf-website" type="text" name="website" tabindex="-1" autocomplete="off"></div>'
		. '<p class="llp-rf-small">Leave a phone number or an email so we can put it right. We only use your details to reply to you.'
		. ( $privacy ? ' <a href="' . esc_url( $privacy ) . '">Privacy Policy</a>' : '' ) . '</p>'
		. '<p class="llp-rf-error" role="alert" hidden></p>'
		. '<button type="submit" class="llp-rf-btn llp-rf-primary">Submit Feedback</button>'
		. '<button type="button" class="llp-rf-btn llp-rf-secondary" data-back>Back</button></form>';

	$html .= '<div class="llp-rf-step" data-step="positive" hidden><h2>Thank you!</h2>'
		. ( $review
			? '<p>Would you share your experience on Google? It really helps.</p><a class="llp-rf-btn llp-rf-primary" href="' . $review . '" rel="noopener">Leave a Google Review</a>'
			: '<p>We\'re really glad you were happy with the work.</p>' )
		. '</div>';

	$html .= '<div class="llp-rf-step" data-step="thanks" hidden><h2>Thank you for your feedback!</h2>'
		. '<p>We appreciate your input and will use it to improve.</p></div></div>';

	if ( ! $assets ) {
		$assets = true;
		$html  .= llp_review_funnel_assets();
	}
	return $html;
}

/** The styles and the script, printed once a page. */
function llp_review_funnel_assets() {
	$css = '
.llp-rf{--llp-accent:var(--e-global-color-accent,#3f6212);--llp-primary:var(--e-global-color-primary,#1f2937);--llp-hover:var(--e-global-color-secondary,#e5e7eb);background:var(--llp-accent);color:#fff;padding:30px;width:100%;box-sizing:border-box;border-radius:16px;text-align:center;font-family:inherit}
.llp-rf *{box-sizing:border-box}
.llp-rf [hidden]{display:none!important}
.llp-rf h2{color:#fff;margin:0 0 12px;font-size:24px;line-height:30px;font-weight:800}
.llp-rf p{color:#fff;line-height:1.5;margin:0 0 12px}
.llp-rf .llp-rf-step>p:last-child{margin-bottom:0}
.llp-rf a{color:#fff;font-weight:600}
.llp-rf-stars{display:flex;justify-content:center;gap:4px;margin:24px 0;padding:6px 10px;background:#fff;border-radius:999px}
.llp-rf .llp-rf-star{font-size:38px;line-height:1;color:#d1d5db;background:none;border:none;padding:4px;cursor:pointer;font-family:inherit;border-radius:50%;transition:background .2s,color .2s}
.llp-rf .llp-rf-star.is-on{color:var(--llp-accent)}
.llp-rf .llp-rf-star:hover,.llp-rf .llp-rf-star:focus-visible{background:var(--llp-primary)!important;color:#fff!important;border:none!important;outline:none}
.llp-rf-label{display:block;text-align:left;font-size:14px;font-weight:600;margin:12px 0 4px;color:#fff}
.llp-rf textarea,.llp-rf input[type=text],.llp-rf input[type=tel],.llp-rf input[type=email]{width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font:inherit;color:#111;background:#fff}
.llp-rf textarea{height:100px;resize:vertical}
.llp-rf-trap{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}
.llp-rf .llp-rf-small{font-size:12px;opacity:.9;margin:12px 0 0;text-align:left}
.llp-rf .llp-rf-error{background:#fff;color:#b91c1c;border-radius:8px;padding:10px 12px;margin:12px 0 0;font-weight:600;text-align:left}
.llp-rf .llp-rf-btn{display:block;width:100%;padding:13px;margin-top:14px;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-family:inherit;font-weight:600;text-decoration:none;text-align:center}
.llp-rf .llp-rf-primary{background:var(--llp-primary);color:#fff}
.llp-rf .llp-rf-secondary{background:#fff;color:var(--llp-primary)}
.llp-rf .llp-rf-btn:hover,.llp-rf .llp-rf-btn:focus{background:var(--llp-hover)!important;color:var(--llp-primary)!important;border:none!important}
.llp-rf .llp-rf-btn[disabled]{opacity:.6;cursor:default}
';
	$js = '
(function(){
  function setUp(box){
    if(box.dataset.llpReady)return; box.dataset.llpReady="1";
    var review=box.dataset.review||"", sendTo=box.dataset.send||"", phone=box.dataset.phone||"";
    var steps=box.querySelectorAll("[data-step]"), stars=box.querySelectorAll(".llp-rf-star");
    var form=box.querySelector("form"), error=box.querySelector(".llp-rf-error"), rating=0;
    function show(name){ for(var i=0;i<steps.length;i++){ steps[i].hidden = steps[i].getAttribute("data-step")!==name; } }
    function paint(){ for(var i=0;i<stars.length;i++){ stars[i].classList.toggle("is-on", Number(stars[i].dataset.rating)<=rating); } }
    function say(msg){ error.textContent=msg; error.hidden=!msg; }
    for(var i=0;i<stars.length;i++){
      stars[i].addEventListener("click", function(){
        rating=Number(this.dataset.rating); paint(); say("");
        if(rating<=3){ show("feedback"); var t=form.querySelector("textarea"); if(t)t.focus(); return; }
        show("positive");
        if(review){ setTimeout(function(){ window.location.assign(review); }, 500); }
      });
    }
    box.querySelector("[data-back]").addEventListener("click", function(){ rating=0; paint(); say(""); show("rating"); });
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var f=form.elements, v={ stars:rating, feedback:f.feedback.value.trim(), name:f.name.value.trim(), phone:f.phone.value.trim(), email:f.email.value.trim(), website:f.website.value, page_url:window.location.origin+window.location.pathname };
      if(!v.feedback){ say("Please tell us what went wrong."); f.feedback.focus(); return; }
      if(!v.name){ say("Please add your name."); f.name.focus(); return; }
      if(!v.phone&&!v.email){ say("Please add a phone number or an email so we can reply."); f.phone.focus(); return; }
      var btn=form.querySelector("[type=submit]"); btn.disabled=true; btn.textContent="Sending..."; say("");
      var fail=function(msg){ btn.disabled=false; btn.textContent="Submit Feedback"; say(msg||("Sorry, that did not send. Please try again"+(phone?", or call us on "+phone:"")+".")); };
      fetch(sendTo,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(v)})
        .then(function(r){ return r.json().catch(function(){return {};}).then(function(j){ return {ok:r.ok,status:r.status,j:j}; }); })
        .then(function(r){ if(r.ok&&r.j&&r.j.ok){ form.reset(); btn.disabled=false; btn.textContent="Submit Feedback"; show("thanks"); } else { fail(r.status===400||r.status===429 ? (r.j&&r.j.message) : ""); } })
        .catch(function(){ fail(""); });
    });
  }
  function all(){ var b=document.querySelectorAll("[data-llp-rf]"); for(var i=0;i<b.length;i++)setUp(b[i]); }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",all); else all();
})();
';
	return '<style id="llp-rf-css">' . $css . '</style><script id="llp-rf-js">' . $js . '</script>';
}
