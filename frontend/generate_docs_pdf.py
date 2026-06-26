import os
import sys

# HTML content to render
html_content = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Full-Stack Core Specifications Manual</title>
<style>
  @page {
    size: A4;
    margin: 20mm 15mm;
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 8pt;
      color: #64748b;
    }
  }
  
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    font-size: 10.5pt;
  }
  
  h1, h2, h3, h4 {
    color: #0f172a;
    font-weight: 700;
  }
  
  /* Cover Page */
  .cover {
    page-break-after: always;
    padding-top: 40mm;
    height: 100%;
  }
  
  .cover-accent {
    width: 80px;
    height: 6px;
    background-color: #4f46e5;
    margin-bottom: 25px;
  }
  
  .cover h1 {
    font-size: 30pt;
    line-height: 1.2;
    margin: 0 0 15px 0;
    color: #0f172a;
    font-weight: 800;
  }
  
  .cover .subtitle {
    font-size: 16pt;
    color: #475569;
    margin: 0 0 45px 0;
    font-weight: 400;
  }
  
  .cover .metadata {
    margin-top: 60mm;
    border-top: 1px solid #e2e8f0;
    padding-top: 25px;
    font-size: 9.5pt;
    color: #64748b;
  }
  
  .cover .metadata-row {
    margin-bottom: 8px;
  }
  
  .cover .metadata-label {
    font-weight: bold;
    color: #475569;
    display: inline-block;
    width: 120px;
  }
  
  /* Section Layout */
  .section {
    page-break-after: always;
    margin-top: 10mm;
  }
  
  .section:last-of-type {
    page-break-after: avoid;
  }
  
  h2 {
    font-size: 16pt;
    border-left: 4px solid #4f46e5;
    padding-left: 12px;
    margin-top: 30px;
    margin-bottom: 15px;
    page-break-after: avoid;
  }
  
  h3 {
    font-size: 12pt;
    margin-top: 20px;
    margin-bottom: 10px;
    color: #334155;
    page-break-after: avoid;
  }
  
  p {
    margin-top: 0;
    margin-bottom: 15px;
    text-align: justify;
  }
  
  ul {
    margin-top: 0;
    margin-bottom: 15px;
    padding-left: 20px;
  }
  
  li {
    margin-bottom: 6px;
  }
  
  /* Table styling */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    page-break-inside: avoid;
  }
  
  th, td {
    padding: 10px 12px;
    text-align: left;
    font-size: 9.5pt;
    border-bottom: 1px solid #e2e8f0;
  }
  
  th {
    background-color: #f8fafc;
    color: #334155;
    font-weight: bold;
    border-top: 1px solid #cbd5e1;
    border-bottom: 2px solid #cbd5e1;
  }
  
  tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  
  .formula-box {
    background-color: #f1f5f9;
    border-left: 4px solid #64748b;
    padding: 15px;
    margin: 15px 0;
    font-family: Consolas, Monaco, monospace;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  
  .page-break-inside-avoid {
    page-break-inside: avoid;
  }
</style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover">
    <div class="cover-accent"></div>
    <h1>Full-Stack Core<br>Specifications Manual</h1>
    <div class="subtitle">Colour Prediction & Premium Dice Betting Platform</div>
    
    <div class="metadata">
      <div class="metadata-row">
        <span class="metadata-label">Date:</span>
        <span>June 2026</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-label">Stack:</span>
        <span>React (Vite), Tailwind CSS, Shadcn/ui, Node.js, Express, Socket.io, MongoDB</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-label">Author:</span>
        <span>Software & Security Architecture Team</span>
      </div>
      <div class="metadata-row">
        <span class="metadata-label">Document Version:</span>
        <span>v1.2.0</span>
      </div>
    </div>
  </div>

  <!-- Section 1 -->
  <div class="section">
    <h2>Section 1: Product Requirement Document (PRD)</h2>
    <p>
      The platform combines an interactive mobile-first e-commerce catalog store feed with two core dynamic gaming components: a real-time Color Prediction game and a draggable Dice multiplier simulator. Designed to drive user engagement and gamified retention, it implements clean wallet transactions, voucher logic, and VIP club progression.
    </p>
    
    <h3>1.1 Store Feed & Gaming Integration</h3>
    <p>
      The main landing feed leverages an online e-commerce layout displaying custom carousel banners and a two-column list of high-end accessories (AuraPods Pro, Chronos Watch, Mechanical Keyboards). Below this retail layer, active lobby menus route users directly into the dynamic lottery prediction rooms or the live dice slider console.
    </p>

    <h3>1.2 Role-Based Workspace Actions</h3>
    <p>
      To support administration, the user context dynamically adapts interfaces based on three separate clearance tiers:
    </p>
    <ul>
      <li><strong>Standard User:</strong> Standard gameplay options, personal transaction log summaries, normal deposits, and withdrawal destination registrations.</li>
      <li><strong>Admin:</strong> Strict read-only views of system metrics, total transaction summaries, concurrent draw result listings, and user logs. No editing operations are allowed.</li>
      <li><strong>Super Admin:</strong> Full read/write management clearance. Allows overriding banners, editing products list variables, managing vouchers distribution, and executing direct wallet adjustment permissions.</li>
    </ul>
  </div>

  <!-- Section 2 -->
  <div class="section">
    <h2>Section 2: Frontend Specification Document</h2>
    <p>
      The user interface is designed centered around a strict mobile frame layout with standard width restrictions and smooth touch interactions.
    </p>
    
    <h3>2.1 Sticky Bottom Navigation Bar</h3>
    <p>
      The navigation is locked inside a fixed bottom tab bar container restricted to a maximum width (`max-w-md`) with soft slate borders and an backdrop blur filter. It maps three key routes:
    </p>
    <ul>
      <li><strong>Home Tab:</strong> Displays promo slide banners, active category blocks, and the double-column retail catalog cards.</li>
      <li><strong>Game Tab:</strong> Central entrance for prediction modes and gaming lobbies.</li>
      <li><strong>Profile Tab:</strong> User dashboard for VIP privileges, account settings, referral stats, and transaction logs.</li>
    </ul>

    <h3>2.2 Detailed UI Layout Breakdowns</h3>
    
    <h4>2.2.1 Homepage Layout Elements</h4>
    <ul>
      <li><strong>Top Navigation Bar:</strong> Shows system notifications alerts button on the left and lobby entrance drawer toggler on the right.</li>
      <li><strong>Auto-Scroll Carousel Banners:</strong> Multi-color gradient slides detailing events (Spin Challenge, Invites, Tournaments) with active autoplay and hover stop events.</li>
      <li><strong>Categories Matrix:</strong> Round buttons for active categories (Colour, Dice, Spin) alongside frosted, semi-transparent overlays displaying a "Coming Soon" badge for Slots, Cards, and Sports books.</li>
      <li><strong>Product Catalog:</strong> A two-column masonry card grid showing item images, rating icons, pricing text (gross vs. discounted), and active bag actions.</li>
    </ul>

    <h4>2.2.2 Game Page Layout Elements</h4>
    <ul>
      <li><strong>Header Stats:</strong> Wallet Balance display pill (integrates real and bonus balance breakdowns) with direct cash-in buttons.</li>
      <li><strong>Game Lobbies Navigator:</strong> Carousel controls to toggle concurrently running game mode clocks (30s, 1m, 2m, 5m).</li>
      <li><strong>Active Betting Deck:</strong> Betting grid with prediction selection pills (Red, Green, Violet) and target numbers. In the last 5 seconds of the countdown, an absolute locking overlay blocks input actions and shows a large digital countdown.</li>
      <li><strong>Result Timeline:</strong> Historical log displaying previous round period IDs, winning color badges, and number spheres.</li>
    </ul>
  </div>

  <!-- Section 3 -->
  <div class="section">
    <h2>Section 3: Technical Architecture & Financial Engine</h2>
    <p>
      Core calculations, safety clamps, and fee progressions are processed dynamically to ensure the financial security of the platform.
    </p>
    
    <h3>3.1 Dice Game Mathematical Model</h3>
    <p>
      The Dice slider UI translates slider drag coordinates directly into win probabilities and multiplier values in real-time.
    </p>
    
    <div class="formula-box">
      Win Probability (P) = Target Number (Over mode: 100 - target, Under mode: target)<br>
      Multiplier (M) = 98 / Win Probability<br>
      Potential Profit = (Bet Amount * M) - Bet Amount
    </div>
    
    <p>
      <strong>Slider Loss/Win Color Zones:</strong> The slider background track updates dynamically using a linear gradient showing loss ranges in light red (`#fee2e2`) and winning ranges in light green (`#dcfce7`), divided cleanly at the target coordinate index.
    </p>
    <p>
      <strong>Safety Clamp:</strong> The targets are strictly restricted between 5.00 and 95.00. This guarantees that the win chance never exceeds 95.00%, preventing riskless 1.00x bets used to bypass wagering requirements. The minimum multiplier is set at 1.03x.
    </p>

    <h3>3.2 Withdrawal Fee Logic</h3>
    <p>
      Withdrawals are verified to ensure that the processing fee is added on top of the payout and deducted from the wallet balance:
    </p>
    <ul>
      <li><strong>₹100 exactly:</strong> Deducts ₹109 from the wallet (₹100 payout + flat 9% fee).</li>
      <li><strong>₹101 to ₹1,000:</strong> Base fee of ₹9 for the first ₹100, plus a flat 3% fee on the remaining amount (e.g., ₹200 payout costs ₹212).</li>
      <li><strong>Above ₹1,000:</strong> Stabilizes to a flat 3% fee of the entire requested amount (e.g., ₹2,000 payout costs ₹2,060).</li>
    </ul>
    <p>
      <strong>Core Constraints:</strong> Single transaction withdrawal limit is Min ₹100 and Max ₹5,000. To prevent fraud, the account holder name is read-only and locked to the name provided during signup (`user.name`).
    </p>
  </div>

  <!-- Section 4 -->
  <div class="section">
    <h2>Section 4: Security & Access Matrix</h2>
    <p>
      The following matrix details the role-based capabilities enforced across all modules of the platform.
    </p>
    
    <div class="page-break-inside-avoid">
      <table>
        <thead>
          <tr>
            <th>Module Domain</th>
            <th>Standard User</th>
            <th>Admin Role</th>
            <th>Super Admin Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Game Betting</strong></td>
            <td>Read / Write (Place Bets)</td>
            <td>Read-Only Logs</td>
            <td>Read-Only Logs</td>
          </tr>
          <tr>
            <td><strong>Wallet Withdrawal</strong></td>
            <td>Write (Request Payouts)</td>
            <td>Read-Only Logs</td>
            <td>Write (Approve / Deny)</td>
          </tr>
          <tr>
            <td><strong>Wallet Deposits</strong></td>
            <td>Write (Request Deposits)</td>
            <td>Read-Only Logs</td>
            <td>Write (Credit Balance)</td>
          </tr>
          <tr>
            <td><strong>Promo Banners</strong></td>
            <td>Read-Only View</td>
            <td>Read-Only View</td>
            <td>Read / Write (Update slides)</td>
          </tr>
          <tr>
            <td><strong>Product Catalog</strong></td>
            <td>Read / Write (Buy Items)</td>
            <td>Read-Only view</td>
            <td>Read / Write (Update Stock)</td>
          </tr>
          <tr>
            <td><strong>VIP & Vouchers</strong></td>
            <td>Read / Claim Available</td>
            <td>Read-Only view</td>
            <td>Read / Write (Distribute)</td>
          </tr>
          <tr>
            <td><strong>System Config</strong></td>
            <td>No Access</td>
            <td>Read-Only view</td>
            <td>Read / Write (Edit Settings)</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</body>
</html>
"""

# Write HTML file
with open("docs.html", "w", encoding="utf-8") as f:
    f.write(html_content)

print("HTML template written to docs.html.")

# Compile using WeasyPrint
try:
    import weasyprint
    print("WeasyPrint imported successfully. Compiling PDF...")
    weasyprint.HTML("docs.html").write_pdf("system_specification.pdf")
    print("Success! system_specification.pdf has been compiled.")
except ImportError:
    print("\\n[ERROR] WeasyPrint package is not installed in your Python environment.", file=sys.stderr)
    print("To install WeasyPrint and compile the PDF, please run:", file=sys.stderr)
    print("  pip install weasyprint", file=sys.stderr)
    print("\\nNote: WeasyPrint requires external C libraries (Pango, Cairo, Glib) to render HTML to PDF.", file=sys.stderr)
    print("On Windows, you can install them using GTK+ or MSYS2. If they are missing, WeasyPrint will raise an error during execution.", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"\\n[ERROR] Failed to compile PDF: {e}", file=sys.stderr)
    sys.exit(1)
