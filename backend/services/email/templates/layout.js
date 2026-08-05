/**
 * Shared HTML email chrome for M2N Hotels (ink / cream / gold-red brand).
 * Inline styles for broad client support; no external assets required.
 */

const COLORS = {
  ink: "#0B0B0B",
  inkSoft: "#161616",
  cream: "#FFFFFF",
  creamDim: "#F8F5F0",
  muted: "#6B6B6B",
  gold: "#D71920",
  accent: "#C9A24D",
  line: "#E8E2D8",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLayout({
  brandName,
  preheader,
  title,
  introHtml,
  bodyHtml,
  cta,
  footerNote,
}) {
  const brand = escapeHtml(brandName || "M2N Hotels");
  const pre = escapeHtml(preheader || "");
  const heading = escapeHtml(title || "");
  const ctaBlock =
    cta && cta.href
      ? `
      <tr>
        <td style="padding:28px 0 8px;">
          <a href="${escapeHtml(cta.href)}"
             style="display:inline-block;background:${COLORS.gold};color:${COLORS.cream};text-decoration:none;padding:14px 28px;font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">
            ${escapeHtml(cta.label || "View booking")}
          </a>
        </td>
      </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.creamDim};color:${COLORS.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${pre}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.creamDim};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${COLORS.cream};border:1px solid ${COLORS.line};">
          <tr>
            <td style="background:${COLORS.ink};padding:28px 32px;border-bottom:3px solid ${COLORS.gold};">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.12em;color:${COLORS.cream};">
                ${brand}
              </div>
              <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${COLORS.accent};">
                Reservations
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 16px;font-family:Georgia,'Times New Roman',serif;">
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:normal;color:${COLORS.ink};line-height:1.3;">
                ${heading}
              </h1>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COLORS.inkSoft};">
                ${introHtml || ""}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${COLORS.inkSoft};">
              ${bodyHtml || ""}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${COLORS.line};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${COLORS.muted};">
              ${footerNote || `This message was sent by ${brand}. Please do not reply with payment details.`}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRows(rows) {
  const items = (rows || [])
    .filter((row) => row && row.value != null && String(row.value).trim() !== "")
    .map(
      (row) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.line};width:38%;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.muted};vertical-align:top;">
          ${escapeHtml(row.label)}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.line};font-size:14px;color:${COLORS.ink};vertical-align:top;">
          ${escapeHtml(row.value)}
        </td>
      </tr>`
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      ${items}
    </table>`;
}

module.exports = {
  COLORS,
  escapeHtml,
  renderLayout,
  detailRows,
};
