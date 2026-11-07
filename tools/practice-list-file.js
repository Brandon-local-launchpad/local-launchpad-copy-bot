'use strict';
// The practice tick list as a Word document, for a client who would rather fill in a file than open the link.
//   node tools/practice-list-file.js "<company>" <niche stem> <file.docx>

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { orderedPractices } = require('../practices-step');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const run = (t, bold) => `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const para = (t, { bold = false, size = null, after = 120 } = {}) => `<w:p><w:pPr><w:spacing w:after="${after}"/></w:pPr><w:r><w:rPr>${bold ? '<w:b/>' : ''}${size ? `<w:sz w:val="${size}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
const cell = (content, width, center = false) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:before="60" w:after="60"/>${center ? '<w:jc w:val="center"/>' : ''}</w:pPr>${content}</w:p></w:tc>`;
const row = (a, b, c, bold) => `<w:tr><w:trPr><w:cantSplit/>${bold ? '<w:tblHeader/>' : ''}</w:trPr>${cell(run(a, bold), 7226)}${cell(run(b, bold), 900, true)}${cell(run(c, bold), 900, true)}</w:tr>`;

function documentXml(company, practices) {
  const border = n => `<w:${n} w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${para(`How ${company} works`, { bold: true, size: 36, after: 160 })}
${para('Your website only says what you tell us is true, so we need your answer on each of these.')}
${para('Put an X under Yes if you always do this. Put an X under No if you don\'t, or only sometimes do. A No is fine: we simply leave it off the site.', { after: 200 })}
<w:tbl><w:tblPr><w:tblW w:w="9026" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="7226"/><w:gridCol w:w="900"/><w:gridCol w:w="900"/></w:tblGrid>
${row('How you work', 'Yes', 'No', true)}
${practices.map(p => row(p.label, '', '', false)).join('\n')}
</w:tbl>
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1440" w:bottom="1134" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
</w:body></w:document>`;
}

async function build(company, stem, file) {
  const niche = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'niche-library', `${stem}.json`), 'utf8'));
  const practices = orderedPractices(niche);
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.folder('_rels').file('.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.folder('word').file('document.xml', documentXml(company, practices));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  return practices.length;
}

if (require.main === module) {
  const [company, stem, file] = process.argv.slice(2);
  if (!company || !stem || !file) { console.log('Usage: node tools/practice-list-file.js "<company>" <niche stem> <file.docx>'); process.exit(2); }
  build(company, stem, file).then(n => console.log(`${n} practices written to ${file}`)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = { build, documentXml };
