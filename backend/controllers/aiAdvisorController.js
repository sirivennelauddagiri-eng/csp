// ─────────────────────────────────────────────────────────────────────────────
// AI Carbon Reduction Advisor  (rule-based engine, no external API required)
// POST /api/ai/carbon-advisor
// ─────────────────────────────────────────────────────────────────────────────

const SAFE_LIMIT_KG_MONTH = 166.7; // 2 t/year ÷ 12
const GLOBAL_AVG_KG_MONTH = 400;   // ~4.8 t/year

// ── Emission factor weights (used for proportional recommendation sizing) ─────
const CATEGORY_META = {
    home: {
        label: "Home Energy",
        icon: "🏠",
        tips: [
            { trigger: 200, action: "Switch all bulbs to LED lighting", reduction_kg: 5 },
            { trigger: 300, action: "Install a smart thermostat to optimise heating cycles", reduction_kg: 15 },
            { trigger: 400, action: "Add roof insulation or draught-proofing to reduce heat loss", reduction_kg: 20 },
            { trigger: 500, action: "Switch to a renewable electricity tariff", reduction_kg: 60 },
            { trigger: 700, action: "Install rooftop solar panels (offsets up to 80 % of home emissions)", reduction_kg: 110 },
        ]
    },
    travel: {
        label: "Travel & Commute",
        icon: "🚗",
        tips: [
            { trigger: 50, action: "Walk or cycle for trips under 3 km", reduction_kg: 8 },
            { trigger: 100, action: "Use public transport 2 extra days per week", reduction_kg: 25 },
            { trigger: 150, action: "Carpool with at least one colleague for daily commute", reduction_kg: 45 },
            { trigger: 250, action: "Switch to a hybrid vehicle", reduction_kg: 80 },
            { trigger: 400, action: "Switch to a fully electric vehicle", reduction_kg: 160 },
        ]
    },
    flying: {
        label: "Air Travel",
        icon: "✈️",
        tips: [
            { trigger: 20, action: "Replace one short-haul flight with train travel", reduction_kg: 21 },
            { trigger: 60, action: "Avoid one medium-haul flight per year", reduction_kg: 58 },
            { trigger: 100, action: "Choose economy class (30–40 % lower per-seat emissions than business)", reduction_kg: 35 },
            { trigger: 200, action: "Eliminate one long-haul return flight per year", reduction_kg: 270 },
            { trigger: 300, action: "Take a staycation or destination accessible by rail", reduction_kg: 400 },
        ]
    },
    food: {
        label: "Diet & Food",
        icon: "🥦",
        tips: [
            { trigger: 60, action: "Reduce food waste by meal-planning and freezing leftovers", reduction_kg: 12 },
            { trigger: 80, action: "Buy local and seasonal produce for 50 % of your groceries", reduction_kg: 10 },
            { trigger: 100, action: "Have 2 meat-free days per week", reduction_kg: 25 },
            { trigger: 130, action: "Reduce red meat to a maximum of 2 meals per week", reduction_kg: 50 },
            { trigger: 160, action: "Switch to a predominantly plant-based diet", reduction_kg: 80 },
        ]
    },
    expenditure: {
        label: "Purchases & Services",
        icon: "🛍️",
        tips: [
            { trigger: 5, action: "Buy second-hand clothing and electronics where possible", reduction_kg: 8 },
            { trigger: 15, action: "Choose certified sustainable brands for household goods", reduction_kg: 12 },
            { trigger: 30, action: "Repair devices instead of replacing — extend product life by 2 years", reduction_kg: 20 },
            { trigger: 50, action: "Reduce online shopping orders (batching reduces delivery emissions)", reduction_kg: 10 },
            { trigger: 80, action: "Audit subscriptions and services for sustainability credentials", reduction_kg: 15 },
        ]
    }
};

// ── Roadmap milestones ────────────────────────────────────────────────────────
function buildRoadmap(totalKg, reductionNeeded) {
    if (reductionNeeded <= 0) {
        return [{ step: 1, milestone: "You are already within the safe carbon limit. Maintain your habits!", target_kg: totalKg }];
    }
    const steps = Math.min(4, Math.ceil(reductionNeeded / (reductionNeeded / 4)));
    const perStep = reductionNeeded / steps;
    return Array.from({ length: steps }, (_, i) => ({
        step: i + 1,
        milestone: `Month ${(i + 1) * 3}: Reduce by ${Math.round(perStep * (i + 1))} kg/month`,
        target_kg: Math.round(totalKg - perStep * (i + 1)),
        cumulative_reduction_kg: Math.round(perStep * (i + 1))
    }));
}

// ── Sustainability score ──────────────────────────────────────────────────────
function calcScore(totalKg) {
    // 0 kg → 100, GLOBAL_AVG → 50, 2× global avg → 0
    return Math.max(0, Math.min(100, Math.round(100 - (totalKg / (GLOBAL_AVG_KG_MONTH * 2)) * 100)));
}

// ── Comprehensive Project Knowledge Base ──────────────────────────────────────
// Covers: FixMyCity Portal project, all pages, features, calculators,
//         carbon science, sustainability tips, tech stack, auth, etc.
// ─────────────────────────────────────────────────────────────────────────────
const CHAT_KB = [

    // ── PROJECT OVERVIEW ──────────────────────────────────────────────────────
    {
        keywords: ["what is this project", "what is fixmycity", "about this app", "about the project", "what does this app do", "purpose of this", "what can i do here"],
        reply: "🌿 FixMyCity Portal is a full-stack civic sustainability platform. It lets citizens report cleanliness issues, track their carbon footprint, earn eco-rewards, join community campaigns, and collaborate on green projects. The platform is built with HTML/CSS/JS on the frontend and Node.js + Express + MongoDB on the backend."
    },

    {
        keywords: ["how does it work", "how to use", "getting started", "how do i start", "what are the features", "main features"],
        reply: "📋 FixMyCity Portal has 5 main sections:\n1️⃣ Dashboard – your personal stats and recent activity\n2️⃣ Community – join campaigns and view leaderboards\n3️⃣ Rewards – redeem eco-points for badges and prizes\n4️⃣ Projects – collaborate on local green projects\n5️⃣ Impact – Carbon Footprint Tracker + AI Advisor\nLog in first to access all features."
    },

    // ── AUTH / LOGIN ──────────────────────────────────────────────────────────
    {
        keywords: ["how to login", "how to register", "sign up", "create account", "login page", "auth", "authentication", "jwt", "token"],
        reply: "🔐 Authentication uses JWT tokens stored in localStorage. To use the app:\n• Register at /auth/login.html with your name, email and password\n• On login, a token is saved and used for all API calls\n• The token expires and you'll be redirected to login if it becomes invalid\n• Logout clears the token and returns you to the landing page."
    },

    {
        keywords: ["forgot password", "reset password", "change password", "update password"],
        reply: "🔑 Password reset is not yet implemented as a self-service flow. To reset, an admin would update the password in the MongoDB database. You can update your profile details (name, email, location) from the Dashboard → Edit Profile button."
    },

    // ── DASHBOARD / CITIZEN PAGE ──────────────────────────────────────────────
    {
        keywords: ["dashboard", "citizen page", "citizen.html", "my stats", "overview", "home page after login", "profile"],
        reply: "🏠 The Citizen Dashboard (citizen.html) shows:\n• Your name and eco-warrior level\n• Points earned\n• Reports submitted\n• Recent activities\n• Edit Profile panel (click 'Edit Profile' to update name, email, location)\nIt's the first page you land on after logging in."
    },

    {
        keywords: ["edit profile", "update profile", "change name", "change email", "update my info"],
        reply: "✏️ To edit your profile:\n1. Go to the Dashboard (citizen.html)\n2. Click the 'Edit Profile' button\n3. Update your name, email, or location\n4. Click Save — changes are sent to PUT /api/auth/me and stored in MongoDB."
    },

    {
        keywords: ["points", "eco points", "how to earn points", "rewards points", "earn more points"],
        reply: "⭐ Eco Points are earned by:\n• Submitting cleanliness reports\n• Completing community challenges\n• Participating in green projects\n• Reducing your carbon footprint score\nPoints are displayed on your Dashboard and can be redeemed on the Rewards page."
    },

    // ── COMMUNITY ─────────────────────────────────────────────────────────────
    {
        keywords: ["community", "community page", "community.html", "campaigns", "challenges", "other users", "leaderboard community"],
        reply: "👥 The Community page (community.html) lets you:\n• View and join active cleanliness campaigns\n• See a community leaderboard ranked by eco points\n• Participate in sustainability challenges\n• Connect with other eco-warriors in your area\nYour username is displayed dynamically from your JWT profile."
    },

    // ── REWARDS ───────────────────────────────────────────────────────────────
    {
        keywords: ["rewards", "rewards page", "rewards.html", "badges", "redeem", "prize", "voucher", "how to redeem"],
        reply: "🏆 The Rewards page (rewards.html) shows:\n• Your current eco-points balance\n• Available rewards (badges, vouchers, green product discounts)\n• Redeemable items based on your points\n• A history of redeemed rewards\nPoints are earned through reports, campaigns, and footprint reductions."
    },

    // ── PROJECTS ──────────────────────────────────────────────────────────────
    {
        keywords: ["projects", "projects page", "projects.html", "green projects", "collaboration", "join project", "create project"],
        reply: "📁 The Projects page (projects.html) lets you:\n• Browse active local green initiatives\n• Join ongoing sustainability projects\n• Track project milestones and contributors\n• Collaborate with your community on real-world impact goals\nEach project shows its progress, team size, and environmental goal."
    },

    // ── IMPACT / CARBON TRACKER ───────────────────────────────────────────────
    {
        keywords: ["impact page", "impact.html", "carbon tracker", "carbon footprint tracker", "what is impact", "footprint calculator"],
        reply: "🌍 The Impact page (impact.html) is the Carbon Footprint Tracker. It has:\n• 5 calculators: Home, Travel, Flying, Food, Expenditure\n• Live dashboard cards (Total CO₂, vs Global Avg, Yearly Est., Biggest Source)\n• Pie chart and trend chart\n• Sustainability score ring\n• Personalized tips\n• AI Carbon Reduction Advisor with full analysis, recommendations, roadmap, and this chat!"
    },

    // ── CALCULATOR CATEGORIES ─────────────────────────────────────────────────
    {
        keywords: ["home calculator", "home emissions", "electricity", "lpg", "gas", "heating", "solar offset", "household members", "home energy"],
        reply: "🏠 Home Calculator inputs:\n• Monthly electricity (kWh) → factor: 0.82 kg CO₂/kWh\n• LPG/gas usage (kg/month) → factor: 2.98 kg CO₂/kg\n• Heating source (gas/heat pump/oil/wood)\n• Solar/renewable offset (%)\n• Number of household members (emissions are shared per member)\nOutput: monthly and yearly home CO₂ in kg."
    },

    {
        keywords: ["travel calculator", "car travel", "car emissions", "petrol", "diesel", "electric car", "hybrid", "public transport", "commute"],
        reply: "🚗 Travel Calculator inputs:\n• Car distance per week (km)\n• Fuel type: Petrol (0.21 kg/km), Diesel (0.17), Electric (0.05), Hybrid (0.10)\n• Public transport km/week → 0.089 kg CO₂/km\n• Cycling km/week → 0 emissions\nOutput: monthly and yearly travel CO₂. Switching petrol → EV saves ~160 kg/month."
    },

    {
        keywords: ["flying calculator", "flight emissions", "short haul", "medium haul", "long haul", "seat class", "economy class", "business class", "first class"],
        reply: "✈️ Flying Calculator inputs:\n• Short-haul flights/year (<3h) → 255 kg CO₂ each\n• Medium-haul (3–6h) → 690 kg CO₂ each\n• Long-haul (>6h) → 1,620 kg CO₂ each\n• Seat class multiplier: Economy ×1, Premium Economy ×1.5, Business ×3, First ×4\nOutput: total yearly flight CO₂ and monthly average."
    },

    {
        keywords: ["food calculator", "diet", "vegan", "vegetarian", "meat", "dairy", "local food", "food waste", "omnivore"],
        reply: "🥦 Food Calculator inputs:\n• Diet type: Vegan (30 kg/mo), Vegetarian (50), Mixed (100), Meat-heavy (150)\n• Extra meat servings/week → 0.8 kg CO₂ each\n• Dairy servings/week → 0.2 kg CO₂ each\n• Local food % → reduces up to 10 kg/month\n• Food waste % → adds up to 15 kg/month penalty\nGoing vegan saves ~1.5 tonnes CO₂/year!"
    },

    {
        keywords: ["expenditure calculator", "spending", "clothes", "clothing", "electronics", "household goods", "entertainment", "services", "shopping"],
        reply: "🛍️ Expenditure Calculator inputs:\n• Clothing (₹/month)\n• Electronics (₹/month)\n• Household goods (₹/month)\n• Entertainment (₹/month)\n• Services (₹/month)\nFactor: ~0.005 kg CO₂ per ₹ spent. Buying second-hand, repairing devices, and choosing sustainable brands reduce this significantly."
    },

    // ── DASHBOARD CARDS ───────────────────────────────────────────────────────
    {
        keywords: ["total co2", "total emissions", "how is total calculated", "monthly total"],
        reply: "📊 Total CO₂ = Home + Travel + Flying (monthly avg) + Food + Expenditure, all in kg/month. It updates live as you move sliders. The global average is 400 kg/month (~4.8 t/year). The Paris Agreement safe limit is ~167 kg/month (2 t/year)."
    },

    {
        keywords: ["yearly estimate", "yearly co2", "tons per year", "annual emissions"],
        reply: "📅 Yearly CO₂ estimate = Total monthly CO₂ × 12, divided by 1000 to convert to tonnes. For example, if your monthly total is 300 kg, your yearly estimate is 3.6 tonnes CO₂."
    },

    {
        keywords: ["vs global", "global average", "compared to world", "how do i compare", "benchmark"],
        reply: "🌐 The global average carbon footprint is ~400 kg CO₂/month (4.8 t/year). The 'vs Global Avg' card shows your difference — green means you're below average (good!), red means you're above. The Paris Agreement target is 167 kg/month (2 t/year)."
    },

    {
        keywords: ["biggest source", "top emitter", "which category is worst", "main source of emissions"],
        reply: "🔴 The 'Biggest Source' card shows whichever of the 5 categories (Home, Travel, Flying, Food, Expenditure) has the highest monthly CO₂. Focus your reduction efforts here first for maximum impact."
    },

    // ── SUSTAINABILITY SCORE ──────────────────────────────────────────────────
    {
        keywords: ["sustainability score", "score", "eco score", "how is score calculated", "what is my score", "score ring"],
        reply: "🌟 Sustainability Score (0–100) formula:\n• Score = 100 − (total_kg / 800) × 100\n• 0 kg → Score 100 (perfect)\n• 400 kg (global avg) → Score 50\n• 800+ kg → Score 0\nScore ranges: 70+ = Excellent 🌟, 50–70 = Good 👍, 35–50 = Average ⚠️, <35 = High Impact 🔴"
    },

    // ── AI ADVISOR ────────────────────────────────────────────────────────────
    {
        keywords: ["ai advisor", "ai analysis", "carbon advisor", "how does ai work", "what does the ai do", "analyse my footprint", "ai feature"],
        reply: "🤖 The AI Carbon Reduction Advisor analyzes your footprint and:\n1. Compares your emissions to the 2 t/year safe limit\n2. Identifies your top 3 emission categories\n3. Generates 6 prioritised recommendations with estimated CO₂ savings\n4. Creates a 4-step roadmap to reach safe levels\n5. Calculates your AI Sustainability Score\n\nClick 'Analyse My Footprint' after adjusting your sliders to get your personalised plan."
    },

    {
        keywords: ["recommendation", "suggestions", "what should i do", "reduce footprint", "how to reduce", "reduce my emissions", "action plan"],
        reply: "✅ The AI generates up to 6 personalised recommendations based on your specific emission values. Recommendations are ranked by potential impact — the highest CO₂ savers come first. Each card shows the action, the category emoji, and the estimated monthly kg reduction."
    },

    {
        keywords: ["roadmap", "plan", "steps to reduce", "milestone", "how long will it take", "timeline"],
        reply: "🗺️ The Carbon Reduction Roadmap is a 4-step timeline:\n• Each step = 3 months of progress\n• Steps are equally spaced between your current footprint and the 2 t/year safe limit\n• Reach the 🏁 milestone when your target drops to ≤167 kg/month\nConsistent lifestyle changes following the recommendations can get you there within 3–12 months."
    },

    {
        keywords: ["safe limit", "2 tonnes", "paris agreement", "1.5 degrees", "climate target", "global target"],
        reply: "🎯 The globally agreed safe carbon budget is 2 tonnes CO₂ per person per year (~167 kg/month). This aligns with the Paris Agreement's 1.5°C warming limit. The current global average is ~4.8 t/year, meaning most people need to cut their footprint by over 50%."
    },

    // ── CHARTS ───────────────────────────────────────────────────────────────
    {
        keywords: ["pie chart", "doughnut chart", "breakdown chart", "emissions chart", "chart"],
        reply: "📈 The Emissions Breakdown pie chart shows the proportional split of your CO₂ across all 5 categories. It uses Chart.js and updates live as you change sliders. Category colours: Home (bright green), Travel (dark green), Flying (light green), Food (pale green), Expenditure (mint)."
    },

    {
        keywords: ["trend chart", "monthly trend", "history chart", "line chart", "trend over time"],
        reply: "📉 The Monthly Trend chart tracks your CO₂ over the last 6 months with a line chart. The dotted line shows the global average (400 kg). The current month updates live as you move sliders. Historical data points are sample data — future versions will pull real saved data from MongoDB."
    },

    // ── CARBON OFFSETS ────────────────────────────────────────────────────────
    {
        keywords: ["carbon offset", "offset my emissions", "tree planting", "plant trees", "renewable credits", "cookstove", "vcs", "gold standard"],
        reply: "🌳 Carbon Offset Options (shown in the AI panel):\n• Tree Planting: 1 tree absorbs ~21 kg CO₂/year. You'd need ~100 trees to offset 2.1 t/year.\n• Renewable Energy Credits: Support solar/wind projects certified by Gold Standard or VCS.\n• Clean Cookstove Projects: Fund cleaner cooking in developing nations, reducing deforestation.\n\n⚠️ Offsets should complement, not replace, direct emission reductions."
    },

    // ── CARBON SCIENCE ────────────────────────────────────────────────────────
    {
        keywords: ["what is carbon footprint", "define carbon footprint", "co2", "greenhouse gas", "co2 emissions", "carbon dioxide"],
        reply: "🌡️ A carbon footprint is the total greenhouse gas (GHG) emissions — mainly CO₂ — caused by an individual, activity, or organization. It's measured in kilograms or tonnes of CO₂ equivalent (CO₂e). Major sources include energy use, transport, diet, and consumption. Reducing your footprint helps limit global warming."
    },

    {
        keywords: ["solar panels", "install solar", "solar energy", "photovoltaic", "clean energy"],
        reply: "☀️ Installing rooftop solar panels is one of the highest-impact actions. A typical home system (3–5 kW) can offset 60–110 kg CO₂/month and pays back in 5–8 years. Even partial solar coverage (setting your solar slider to 50%+) dramatically cuts home emissions in the calculator."
    },

    {
        keywords: ["electric vehicle", "ev", "switch car", "ev vs petrol", "ev emissions"],
        reply: "🔌 Switching from a petrol car to an EV reduces per-km transport emissions by ~75%. Even when charged from the grid (not solar), EVs are cleaner. In the Travel calculator, switching from 'Petrol' to 'Electric (grid)' drops the emission factor from 0.21 to 0.05 kg/km — saving ~160 kg/month at 100 km/week driving."
    },

    {
        keywords: ["flying emissions", "plane emissions", "aviation co2", "reduce flights"],
        reply: "✈️ Aviation is one of the most carbon-intensive activities. A single long-haul return flight emits ~3.2 tonnes CO₂ (at economy class) — equivalent to months of driving. Tips:\n• Take trains instead of short-haul flights\n• Choose economy class (Business emits 3× more per seat)\n• Video call instead of business travel\n• Take fewer but longer holidays"
    },

    {
        keywords: ["food emissions", "meat emissions", "vegan vs meat", "reduce food footprint", "plant based"],
        reply: "🥗 Food is responsible for ~25% of global GHG emissions. Key facts:\n• Beef production emits ~27 kg CO₂ per kg of meat\n• Dairy: ~3.2 kg CO₂ per litre of milk\n• Vegetables: ~0.4–2 kg CO₂ per kg\n• Going vegan: saves ~1.5 tonnes CO₂/year\n• 2 meat-free days/week: saves ~25 kg CO₂/month\n• Reducing food waste by 50%: saves ~15–30 kg/month"
    },

    // ── TECH STACK ────────────────────────────────────────────────────────────
    {
        keywords: ["tech stack", "technology", "built with", "frontend", "backend", "database", "mongodb", "express", "nodejs", "node", "tailwind", "chartjs"],
        reply: "⚙️ FixMyCity Portal tech stack:\n• Frontend: HTML5, Tailwind CSS (CDN), Vanilla JavaScript, Chart.js\n• Backend: Node.js + Express.js\n• Database: MongoDB Atlas (cloud)\n• Auth: JWT (jsonwebtoken), bcrypt for hashing\n• Fonts: Public Sans (Google Fonts), Material Symbols Outlined\n• Frontend served via: npx serve on port 5500\n• Backend API on: port 3000"
    },

    {
        keywords: ["api", "endpoints", "routes", "backend api", "how does the backend work", "rest api"],
        reply: "🔌 Backend API routes:\n• POST /api/auth/register — create account\n• POST /api/auth/login — get JWT token\n• GET /api/auth/me — get logged-in user (protected)\n• PUT /api/auth/me — update profile (protected)\n• POST /api/ai/carbon-advisor — get AI footprint analysis\n• POST /api/ai/chat — AI chat assistant\nAll protected routes require 'Authorization: Bearer <token>' header."
    },

    {
        keywords: ["mongodb", "database", "schema", "model", "user model", "data structure"],
        reply: "🗃️ MongoDB models:\n• User: { name, email, password (hashed), role (citizen/authority), points, timestamps }\n• Activity: { user activity logs }\n• Issue: { reported cleanliness issues }\n• Reward: { reward catalogue }\n• Project: { green project details }\n• Report: { cleanliness reports }\n\nThe database is hosted on MongoDB Atlas cloud."
    },

    {
        keywords: ["localstorage", "local storage", "saved data", "offline", "cached data"],
        reply: "💾 The Carbon Footprint Tracker saves your latest calculated values to localStorage under the key 'carbonFootprint'. This means your data persists between page refreshes. The AI Advisor uses the live calculated values (stored in `_lastFootprint` variable) from your current session's slider positions."
    },

    // ── NAVIGATION / PAGES ────────────────────────────────────────────────────
    {
        keywords: ["pages", "navigation", "menu", "links", "how to navigate", "sidebar", "nav", "header"],
        reply: "🗺️ The app has 5 main pages accessible from the sidebar and top navigation:\n1. Dashboard (citizen.html)\n2. Community (community.html)\n3. Rewards (rewards.html)\n4. Projects (projects.html)\n5. Impact (impact.html) — you're here!\n\nThe active page is highlighted in the nav. Click Logout to return to the landing page (index.html)."
    },

    // ── GENERAL TIPS ──────────────────────────────────────────────────────────
    {
        keywords: ["tips", "reduce emissions", "best tips", "top tips", "easy way to reduce", "quick wins"],
        reply: "💡 Top 5 quickest carbon wins:\n1. 🔌 Switch to an EV or carpool — transport is often the biggest source\n2. ☀️ Solar panels or a green energy tariff — cuts home emissions by up to 80%\n3. 🥗 2 meat-free days/week — saves ~25 kg CO₂/month\n4. ✈️ Skip one short-haul flight — saves ~255 kg CO₂\n5. 💡 LED lighting + smart thermostat — saves up to 20 kg CO₂/month\n\nUse the Impact page calculators to model the exact savings for your lifestyle!"
    },

    {
        keywords: ["how often should i calculate", "track footprint", "monthly tracking", "track over time"],
        reply: "📅 We recommend calculating your carbon footprint monthly. Adjust your sliders to reflect your actual lifestyle that month (driving habits, flights taken, diet changes). Compare your monthly trend chart to see progress over time. Aim to reduce by at least 5–10% each quarter."
    },

    // ── CHAT ITSELF ───────────────────────────────────────────────────────────
    {
        keywords: ["hello", "hi", "hey", "good morning", "good evening", "howdy", "hola"],
        reply: "👋 Hello! I'm the FixMyCity AI Assistant. I can help you with:\n• Understanding your carbon footprint\n• Using the calculators and features\n• Getting reduction tips\n• Learning about the project and tech stack\n\nJust ask me anything!"
    },

    {
        keywords: ["thank you", "thanks", "thx", "great", "awesome", "helpful", "good job"],
        reply: "🌱 You're welcome! Every step towards a lower carbon footprint matters. Keep exploring the Impact page and try the AI Analysis for a personalised reduction plan. Together we can make FixMyCity greener! 🌍"
    },

    {
        keywords: ["who made this", "who built this", "developer", "creator", "made by"],
        reply: "👨‍💻 FixMyCity Portal is a student/developer project built as a full-stack civic tech platform. It uses Node.js, Express, MongoDB, and a Tailwind CSS frontend. The AI Carbon Advisor was designed to work fully offline — no external AI API keys required!"
    },
];

// ── Intelligent keyword matcher ───────────────────────────────────────────────
function chatResponse(question) {
    const q = question.toLowerCase().trim();

    // Score each KB entry by how many of its keywords appear in the question
    let bestMatch = null;
    let bestScore = 0;

    for (const entry of CHAT_KB) {
        let score = 0;
        for (const kw of entry.keywords) {
            // Full phrase match gets high score
            if (q.includes(kw)) {
                score += kw.split(" ").length * 2; // longer phrases score more
            } else {
                // Partial word matching
                const words = kw.split(" ");
                for (const word of words) {
                    if (word.length > 3 && q.includes(word)) score += 1;
                }
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = entry;
        }
    }

    if (bestMatch && bestScore >= 2) {
        return bestMatch.reply;
    }

    // Fallback: check for any single keyword from all entries
    for (const entry of CHAT_KB) {
        for (const kw of entry.keywords) {
            const kwWords = kw.split(" ");
            if (kwWords.some(w => w.length > 4 && q.includes(w))) {
                return entry.reply;
            }
        }
    }

    return "🤔 I don't have a specific answer for that yet, but here's what I can help with:\n• Carbon footprint calculations (Home, Travel, Flying, Food, Expenditure)\n• Understanding the FixMyCity Portal features\n• How to use the Dashboard, Community, Rewards, Projects, and Impact pages\n• Carbon reduction tips and the AI Reduction Plan\n\nTry rephrasing your question, or ask something like 'How does the travel calculator work?' or 'What is the safe carbon limit?'";
}

// ── Main advisor function ─────────────────────────────────────────────────────
exports.getCarbonAdvice = (req, res) => {
    try {
        const { home = 0, travel = 0, flying = 0, food = 0, expenditure = 0 } = req.body;

        const values = {
            home: parseFloat(home) || 0,
            travel: parseFloat(travel) || 0,
            flying: parseFloat(flying) || 0,
            food: parseFloat(food) || 0,
            expenditure: parseFloat(expenditure) || 0,
        };

        const totalKg = +(Object.values(values).reduce((s, v) => s + v, 0)).toFixed(1);
        const totalTons = +(totalKg * 12 / 1000).toFixed(2);
        const reductionNeededKg = Math.max(0, +(totalKg - SAFE_LIMIT_KG_MONTH).toFixed(1));
        const reductionNeededTons = +(reductionNeededKg * 12 / 1000).toFixed(2);

        // Sort categories by emission descending
        const sorted = Object.entries(values).sort(([, a], [, b]) => b - a);
        const mainSources = sorted.filter(([, v]) => v > 0).map(([k]) => k);

        // Build recommendations: pick applicable tips from each category, ordered by impact
        const allRecs = [];
        for (const [cat, val] of sorted) {
            const meta = CATEGORY_META[cat];
            if (!meta) continue;
            const applicableTips = meta.tips.filter(t => val >= t.trigger);
            // Pick the highest-impact tip for this category
            if (applicableTips.length > 0) {
                const best = applicableTips[applicableTips.length - 1];
                allRecs.push({
                    category: meta.label,
                    icon: meta.icon,
                    action: best.action,
                    estimated_reduction_kg_month: best.reduction_kg,
                    estimated_reduction_tons_year: +(best.reduction_kg * 12 / 1000).toFixed(2),
                    priority: val / totalKg // fraction of total — used for sorting
                });
            }
            // Also add a secondary lower-impact tip if available
            if (applicableTips.length > 1) {
                const secondary = applicableTips[0];
                allRecs.push({
                    category: meta.label,
                    icon: meta.icon,
                    action: secondary.action,
                    estimated_reduction_kg_month: secondary.reduction_kg,
                    estimated_reduction_tons_year: +(secondary.reduction_kg * 12 / 1000).toFixed(2),
                    priority: (val / totalKg) * 0.6
                });
            }
        }

        // Sort by priority desc, deduplicate actions, take top 6
        const recommendations = allRecs
            .sort((a, b) => b.priority - a.priority)
            .filter((r, i, arr) => arr.findIndex(x => x.action === r.action) === i)
            .slice(0, 6)
            .map(({ category, icon, action, estimated_reduction_kg_month, estimated_reduction_tons_year }) => ({
                category, icon, action, estimated_reduction_kg_month, estimated_reduction_tons_year
            }));

        const totalPotentialReduction = recommendations.reduce((s, r) => s + r.estimated_reduction_kg_month, 0);
        const score = calcScore(totalKg);
        const roadmap = buildRoadmap(totalKg, reductionNeededKg);

        const response = {
            analysis: {
                current_footprint_kg_month: totalKg,
                current_footprint_tons_year: totalTons,
                safe_limit_tons_year: 2.0,
                safe_limit_kg_month: SAFE_LIMIT_KG_MONTH,
                global_avg_kg_month: GLOBAL_AVG_KG_MONTH,
                reduction_required_kg_month: reductionNeededKg,
                reduction_required_tons_year: reductionNeededTons,
                vs_global_avg_kg: +(totalKg - GLOBAL_AVG_KG_MONTH).toFixed(1),
                sustainability_score: score,
                score_label: score >= 80 ? "Excellent 🌟" : score >= 60 ? "Good 👍" : score >= 40 ? "Average ⚠️" : "High Impact 🔴",
            },
            category_breakdown: Object.entries(values).map(([cat, val]) => ({
                category: cat,
                label: CATEGORY_META[cat]?.label || cat,
                icon: CATEGORY_META[cat]?.icon || "📊",
                kg_month: val,
                tons_year: +(val * 12 / 1000).toFixed(2),
                share_pct: totalKg > 0 ? Math.round((val / totalKg) * 100) : 0
            })),
            main_sources: mainSources,
            recommendations,
            potential_savings: {
                kg_month: Math.round(totalPotentialReduction),
                tons_year: +(totalPotentialReduction * 12 / 1000).toFixed(2),
                achievable_score: calcScore(Math.max(0, totalKg - totalPotentialReduction))
            },
            roadmap,
        };

        res.json(response);
    } catch (err) {
        console.error("AI Advisor error:", err);
        res.status(500).json({ message: "Advisor engine error", error: err.message });
    }
};

// ── Chat assistant ─────────────────────────────────────────────────────────────
exports.chatAssistant = (req, res) => {
    const { question } = req.body;
    if (!question || typeof question !== "string") {
        return res.status(400).json({ message: "question field is required" });
    }
    res.json({ reply: chatResponse(question.trim()) });
};

// ── Impact Hub AI Insights & Network Graph ────────────────────────────────────
exports.getImpactInsights = (req, res) => {
    try {
        const insights = {
            policyTrends: [
                { title: "Zero-Waste Zones Expanding", description: "Local municipalities are showing a 40% increase in zero-waste zone proposals.", impact: "High" },
                { title: "Renewable Subsidies", description: "New state-level subsidies are driving a boom in solar installation requests.", impact: "Medium" }
            ],
            predictions: [
                { area: "Mylapore South", risk: "High", reason: "Historical data shows 85% probability of overflow during monsoon." },
                { area: "Okhla Industrial", risk: "Medium", reason: "Air quality index predicted to drop due to upcoming factory scheduled changes." }
            ],
            network: {
                nodes: [
                    { id: 1, label: "Green Earth NGO", group: "ngo" },
                    { id: 2, label: "City Council", group: "auto" },
                    { id: 3, label: "EcoWarriors", group: "ngo" },
                    { id: 4, label: "Waste Dept", group: "auto" },
                    { id: 5, label: "Water Init", group: "ngo" }
                ],
                edges: [
                    { from: 1, to: 2 },
                    { from: 3, to: 2 },
                    { from: 4, to: 1 },
                    { from: 5, to: 4 },
                    { from: 3, to: 4 }
                ]
            }
        };
        res.json(insights);
    } catch (err) {
        console.error("Impact Insights error:", err);
        res.status(500).json({ message: "Engine error", error: err.message });
    }
};
