import os
import sys
from fpdf import FPDF

class PRDPDF(FPDF):
    def header(self):
        # Draw header on all pages except the cover page
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 116, 139) # slate-500
            self.cell(0, 10, "Product Requirement Document (PRD) - Color Prediction & Dice Platform", border=0, align="L", new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(226, 232, 240) # slate-200
            self.line(15, 20, 195, 20)
            self.ln(5)

    def footer(self):
        # Draw footer on all pages except the cover page
        if self.page_no() > 1:
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 116, 139) # slate-500
            self.set_draw_color(226, 232, 240)
            self.line(15, self.get_y() - 2, 195, self.get_y() - 2)
            self.cell(0, 10, f"Page {self.page_no()}", border=0, align="R")

def create_prd_pdf(filename="product_requirement_document.pdf"):
    pdf = PRDPDF(orientation="P", unit="mm", format="A4")
    pdf.set_margins(15, 20, 15)
    pdf.alias_nb_pages()
    
    # ─── COVER PAGE ───
    pdf.add_page()
    pdf.set_fill_color(15, 23, 42) # Slate-900 dark background
    pdf.rect(0, 0, 210, 297, "F")
    
    # Gold accent line on cover
    pdf.set_fill_color(245, 158, 11) # Amber-500
    pdf.rect(20, 60, 25, 4, "F")
    
    pdf.set_y(80)
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(255, 255, 255)
    pdf.multi_cell(0, 12, "PRODUCT REQUIREMENT\nDOCUMENT (PRD)")
    
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(148, 163, 184) # Slate-400
    pdf.cell(0, 10, "Color Prediction & Premium Dice Betting Platform", new_x="LMARGIN", new_y="NEXT")
    
    # Metadata block at bottom
    pdf.set_y(210)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(245, 158, 11) # Amber-500
    pdf.cell(0, 6, "METADATA & PLATFORM SPECIFICATIONS", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_draw_color(71, 85, 105) # Slate-600
    pdf.line(20, 218, 190, 218)
    pdf.ln(5)
    
    metadata = [
        ("Date:", "June 2026"),
        ("Stack:", "React (Vite), Tailwind CSS, Shadcn/ui, Node.js, Express, MongoDB"),
        ("Author:", "Technical Product & Architecture Division"),
        ("Version:", "v1.3.0 (Official Build)"),
    ]
    
    pdf.set_font("Helvetica", "", 10)
    for label, val in metadata:
        pdf.set_text_color(148, 163, 184) # Slate-400
        pdf.cell(40, 6, label, new_x="RIGHT", new_y="TOP")
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 6, val, new_x="LMARGIN", new_y="NEXT")
        
    # ─── SECTION 1 ───
    pdf.add_page()
    pdf.set_text_color(15, 23, 42) # Reset text color to Slate-900
    
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(79, 70, 229) # Indigo-600
    pdf.cell(0, 10, "Section 1: Executive Summary & Scope", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(15, 23, 42)
    pdf.ln(2)
    
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6, 
        "This Product Requirement Document (PRD) defines the complete functional specifications, frontend layouts, "
        "and mathematical/financial rules governing the integrated gaming and wallet systems. The platform combines "
        "a dynamic retail accessories feed with real-time prediction-based modules to maximize user retention and engagement."
    )
    pdf.ln(4)
    
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "1.1 Product Vision & Core Loops", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "The application integrates an e-commerce catalog featuring accessories (e.g. AuraPods, Chronos Watches, Mechanical Keyboards) "
        "directly into the betting framework. This enables users to utilize their wallet balances to either purchase physical accessories "
        "or place stakes in lottery predictions. The goal is to provide a smooth, low-latency, mobile-first Web App experience that "
        "matches the performance of native iOS/Android applications."
    )
    pdf.ln(4)
    
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "1.2 Role-Based Workspace Clearance Matrix", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "To facilitate proper administration and operation, the user context dynamics adapt profiles based on three clearance tiers:\n\n"
        "1. Standard User: Access to all games, personal transaction histories, linked payment portals, and direct withdrawals.\n"
        "2. Admin: Strictly read-only access to system monitors, transaction registries, user logs, and draw history metrics. No write/override operations are permitted.\n"
        "3. Super Admin: Comprehensive read/write management credentials. Enables updating product parameters, configuring carousel banners, issuing promotional vouchers, and overriding user wallet balances directly."
    )
    
    # ─── SECTION 2 ───
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(79, 70, 229) # Indigo-600
    pdf.cell(0, 10, "Section 2: Color Prediction Game Specifications", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(15, 23, 42)
    pdf.ln(2)
    
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "2.1 Decoupled Game Lobbies & Persistence", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "The Color Prediction game is decoupled into four concurrent timing lobbies: 30 Seconds, 1 Minute, 2 Minutes, and 5 Minutes. "
        "Lobby timers are managed atomically using React refs. Switching tabs does not clear, pause, or reset active countdown loops. "
        "When changing rooms, current draft bet inputs and glow outcome animations are flushed from UI states to keep the display clean."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "2.2 Number-to-Color Remapping & Payout Rules", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "Winning numbers scale from 1 to 10. The remapping configuration is established as follows:\n\n"
        "- Green (Emerald): Assigned to Even numbers 2, 4, 6, 8 (Pays 1.9x payout).\n"
        "- Red (Rose): Assigned to Odd numbers 1, 3, 7, 9 (Pays 1.9x payout).\n"
        "- Violet (Yallet): Assigned to numbers 5 and 10 (Pays 4.5x payout).\n\n"
        "Note on split outcomes: Number 5 acts as a split Red-Violet number, so a round result of 5 triggers winning payouts for both Red and Violet bet targets. Number 10 is only Violet.\n\n"
        "Number Betting: Correctly predicting the exact drawn number (1-10) pays a massive 8x payout."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "2.3 Countdown timer card & 5-Second Betting Lock", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "The timer remaining is rendered as a large, premium dark-digital card block (bg-slate-900 text-emerald-400 font-mono text-2xl). "
        "When the clock reaches 5 seconds, an absolute visual modal locks overlay triggers over the color/number betting deck, "
        "disabling all buttons and preventing any wagers from being confirmed. It displays a large countdown (00:05 to 00:01) to build tension."
    )
    
    # ─── SECTION 3 ───
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(79, 70, 229) # Indigo-600
    pdf.cell(0, 10, "Section 3: Dice Game (Dice Pro) Specs", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(15, 23, 42)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "3.1 Interactive Range Slider Mechanics", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "Dice Pro features a custom range slider track where users select their target bounds. The slider background track displays "
        "colored zones dynamically: Red (#fee2e2) for losing ranges and Green (#dcfce7) for winning ranges, divided at the exact selected coordinate."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "3.2 Mathematical Formulas & safety Clamps", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "The win probability and payout multiplier scale simultaneously based on target value (t):\n\n"
        "- Roll Over Win Chance (P): 100 - t\n"
        "- Roll Under Win Chance (P): t\n"
        "- Range (10) Win Chance (P): Fixed 10% (target start bounds from 0 to 90)\n"
        "- Multiplier Formula (M): M = 98 / Win Probability (rounded to 2 decimal places)\n"
        "- Potential Profit = (Bet Amount * M) - Bet Amount\n\n"
        "Safety Clamp: To prevent the 1.00x multiplier riskless exploit, targets in Over/Under modes are strictly locked between 4.90 and 95.10. "
        "The maximum win probability is restricted to 95.10%, ensuring the minimum multiplier is always 1.03x and the maximum multiplier reaches exactly 20.00x."
    )
    pdf.ln(4)
    
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "3.3 Roll Resolution Scrambler", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "When the timer reaches 0, the digital screen triggers a 1.5s scrambled roll animation where numeric values cycle rapidly. "
        "Once resolved, a colored pin indicator highlights the final rolled result coordinate directly on the slider track."
    )

    # ─── SECTION 4 ───
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(79, 70, 229) # Indigo-600
    pdf.cell(0, 10, "Section 4: Financial Engine & Wallet Rules", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(15, 23, 42)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "4.1 Withdrawal Fee Progression Equation", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "Processing fees are added on top of the requested payout and deducted from the wallet balance. "
        "Let x be the payout amount requested. The fee f(x) is defined piecewise:\n\n"
        "- For x <= 100: f(x) = x * 0.09 (9% flat, Rs. 9 fee for Rs. 100 payout)\n"
        "- For 100 < x <= 1000: f(x) = 9 + (x - 100) * 0.03 (adds 3% on top of the base Rs. 9 fee per Rs. 100 block)\n"
        "- For x > 1000: f(x) = x * 0.03 (stabilizes to a flat 3% of the total amount requested)"
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "4.2 Destination Constraints & Name Security Lock", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "1. Real Money Withdrawals: Users can withdraw their real cash balance (realBalance) at any time. "
        "Wagering alerts are purely informational and do not block withdrawals.\n\n"
        "2. Locked Name Attribute Policy: When linking a bank or UPI destination, the cardholder holderName input is read-only "
        "and locked to user.name. This prevents users from withdrawing funds into third-party accounts.\n\n"
        "3. Limits: Single transaction withdrawal limits are set at Min Rs. 100 and Max Rs. 5,000."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "4.3 Bonus Balance & Wagering Conversion", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "- Winnings Routing: Winnings from wagers placed using bonus credits are routed to bonusBalance if requiredWager > 0.\n"
        "- Auto-Conversion: The instant requiredWager reaches 0, the entire bonus balance converts into withdrawable realBalance immediately."
    )

    # ─── SECTION 5 ───
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(79, 70, 229) # Indigo-600
    pdf.cell(0, 10, "Section 5: Referrals & VIP Milestones", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(15, 23, 42)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "5.1 Referral System & Play Commissions", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6,
        "- Direct Referral Bonus: Users receive a flat Rs. 10 reward when their referee completes a valid first deposit of Rs. 100 or more.\n"
        "- Rebate Play Commission: Users earn dynamic play commissions based on their VIP tier. "
        "Commission is only active and displayed for levels VIP-5 or above (0.5% commission rate at VIP-5, scaling to 2.0% at VIP-20). "
        "For levels VIP-1 to VIP-4, the commission rate is 0.0% and is hidden in the VIP club views."
    )
    pdf.ln(6)

    # ─── SECTION 6 ───
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(79, 70, 229) # Indigo-600
    pdf.cell(0, 10, "Section 6: Role-Based Access Control (RBAC) Matrix", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(15, 23, 42)
    pdf.ln(2)

    col_widths = (35, 45, 45, 55)
    pdf.set_font("Helvetica", "", 8) # Set font size of table content to 8pt
    
    with pdf.table(align="L", col_widths=col_widths, text_align="L") as table:
        row = table.row()
        row.cell("Module Domain")
        row.cell("Standard User")
        row.cell("Admin")
        row.cell("Super Admin")
        
        data_rows = [
            ("Game Betting", "Read / Write (Place Bets)", "Read-Only View", "Read-Only View"),
            ("Wallet Payouts", "Write (Request Payout)", "Read-Only View", "Write (Approve / Deny)"),
            ("Wallet Deposits", "Write (Request Deposit)", "Read-Only View", "Write (Credit Wallet)"),
            ("Promo Banners", "Read-Only View", "Read-Only View", "Read / Write (Configure Banners)"),
            ("Product Feed", "Read / Write (Checkout)", "Read-Only View", "Read / Write (Manage Stock)"),
            ("VIP & Vouchers", "Read / Claim Available", "Read-Only View", "Read / Write (Issue Vouchers)"),
            ("System Settings", "No Access", "Read-Only View", "Read / Write (Manage Settings)")
        ]
        
        for cells in data_rows:
            row = table.row()
            for c in cells:
                row.cell(c)

    pdf.output(filename)
    print(f"Success! {filename} generated.")

if __name__ == "__main__":
    create_prd_pdf()
