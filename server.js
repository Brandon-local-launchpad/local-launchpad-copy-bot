'use strict';

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { validate } = require('./validate');

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Read the prompt documents once at startup.
// Tries the plain name first, then the "(1)" copy produced when files are replaced.
function readDoc(name) {
  const candidates = [
    path.join(__dirname, name.replace('.md', ' (3).md')),
    path.join(__dirname, name.replace('.md', ' (2).md')),
    path.join(__dirname, name.replace('.md', ' (1).md')),
    path.join(__dirname, name),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  throw new Error(`Cannot find ${name} (or (1)/(2)/(3) copies) in ${__dirname}`);
}

const CORE_PROMPT      = readDoc('Homepage_Copywriting_Prompt_CORE.md');
const CALIBRATION_PACK = readDoc('Landscaper_Gardener_Homepage_Calibration_Pack.md');

function buildPrompt({ customValues, geoResearch, h1, onboardingForm }) {
  const sections = [];

  sections.push(CORE_PROMPT.trim());
  sections.push('---\n\n' + CALIBRATION_PACK.trim());

  sections.push(`---

## CLIENT PROJECT KNOWLEDGE

The following is all client-specific data for this generation. Use it to fill every section of the homepage template. Do not invent any facts not present here.

### GHL Custom Values Document
${customValues.trim()}
`);

  sections.push(`### Geographical Research and Context
${geoResearch.trim()}
`);

  if (onboardingForm && onboardingForm.trim()) {
    sections.push(`### Client Onboarding Form Answers
${onboardingForm.trim()}
`);
  }

  sections.push(`### H1 (from Ahrefs research)
The H1 for this homepage is: ${h1.trim()}

Note: In the HERO H1 field of the output template, output this H1 value directly rather than the placeholder text "[INSERT H1 FROM AHREFS]". All H1 dash rules and length rules still apply — if this H1 contains any dashes, rewrite it according to the dash rule.
`);

  return sections.join('\n\n');
}

app.post('/api/generate', async (req, res) => {
  const { customValues, geoResearch, h1, onboardingForm } = req.body;

  if (!customValues || !geoResearch || !h1) {
    return res.status(400).json({ error: 'customValues, geoResearch, and h1 are required.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY environment variable is not set.' });
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt({ customValues, geoResearch, h1, onboardingForm });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const output = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const issues = validate(output, h1, customValues);

    res.json({
      output,
      issues,
      usage: message.usage,
    });
  } catch (err) {
    console.error('Anthropic API error:', err);
    res.status(500).json({ error: err.message || 'API call failed.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Copy bot running at http://localhost:${PORT}`);
});
