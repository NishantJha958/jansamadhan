const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const SLA_TIMES = { 1: 2, 2: 4, 3: 8, 4: 12, 5: 24, 6: 48, 7: 72, 8: 96, 9: 120, 10: 168 };

const DEPARTMENT_ROUTES = {
    Water_Supply: 'Water_Supply_Dept',
    Water_Emergency: 'Water_Supply_Dept',
    Roads_Infrastructure: 'Public_Works_Dept',
    Sanitation: 'Sanitation_Dept',
    Power: 'Power_Dept',
    Power_Emergency: 'Power_Dept',
    Street_Lights: 'Power_Dept',
    Health: 'Health_Dept',
    Health_Services: 'Health_Dept',
    Safety_Emergency: 'General_Admin_Dept',
    Animals: 'Sanitation_Dept',
    Drainage: 'Water_Supply_Dept',
};

function routeComplaint(category) {
    return DEPARTMENT_ROUTES[category] || 'General_Admin_Dept';
}

function keywordAnalysis(desc, cat) {
    const d = desc.toLowerCase();
    let detected_dept = null;
    let pri = 7;

    if (/electricity|power|transformer|current|voltage|बिजली|विद्युत/.test(d)) detected_dept = 'Power_Dept';
    else if (/water|pipe|leak|sewage|drainage|पानी|नाली/.test(d)) detected_dept = 'Water_Supply_Dept';
    else if (/road|pothole|bridge|footpath|सड़क/.test(d)) detected_dept = 'Public_Works_Dept';
    else if (/garbage|trash|waste|cleaning|sanitation|कचरा/.test(d)) detected_dept = 'Sanitation_Dept';
    else if (/hospital|doctor|medical|health|clinic|अस्पताल/.test(d)) detected_dept = 'Health_Dept';

    if (['Power_Emergency', 'Water_Emergency', 'Safety_Emergency'].includes(cat)) { pri = 1; }
    else if (/emergency|danger|hazard|death|killed|safety|shock|blast|live wire|gas leak|मृत्यु|खतरा/.test(d)) { pri = 1; }
    else if (/burst|overflow|pothole|accident|injury|fallen tree|flickering|dark|चोट|दुर्घटना/.test(d)) { pri = 2; }
    else if (/urgent|immediately|night|hospital|medical|dog bite|तुरंत/.test(d)) { pri = 3; }
    else if (/block|smell|dead animal|गंध|दुर्गंध/.test(d)) { pri = 4; }
    else if (/planning|beautification|future|suggestion|योजना|सौंदर्यीकरण/.test(d)) { pri = 9; }

    return { priority: pri, sentiment: 'neutral', detected_department: detected_dept };
}

async function analyzeWithAI(desc, cat) {
    if (!GEMINI_API_KEY) {
        console.log('⚠️  No Gemini API key, using keyword analysis');
        return keywordAnalysis(desc, cat);
    }

    try {
        const prompt = `Analyze this complaint and provide ONLY a JSON response (no markdown, no code blocks):

Description: ${desc}
Category: ${cat}

Provide JSON response with these exact fields:
{
    "priority": 1-10 (1=highest urgency, 10=lowest),
    "sentiment": "positive/neutral/negative",
    "detected_department": "department name"
}

Priority Level Guide:
- P1 (2h): Life-threatening, live wires, major water bursts, gas leaks.
- P2 (4h): Very High. Sewage overflow, large potholes on main roads.
- P3 (8h): High. Street lights out in high-risk areas, hospital equipment issues.
- P4-P5 (12-24h): Medium. Missed garbage collection, minor drainage blocks.
- P6-P7 (48-72h): Standard. Poor maintenance, street cleaning, park lighting.
- P8-P10 (4-7 days): Low. Future planning, beautification, general inquiries.

Department detection rules:
- Water/sewage/drainage issues → "Water_Supply_Dept"
- Road/bridge/infrastructure → "Public_Works_Dept"
- Garbage/cleaning/sanitation → "Sanitation_Dept"
- Electricity/power/transformer → "Power_Dept"
- Hospital/clinic/medical → "Health_Dept"
- Everything else → "General_Admin_Dept"`;

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { timeout: 10000 }
        );

        let resultText = response.data.candidates[0].content.parts[0].text.trim();
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(resultText);

        result.detected_department = result.detected_department || null;
        result.priority = result.priority || 5;
        result.sentiment = result.sentiment || 'neutral';

        console.log(`✅ Gemini AI: Priority=${result.priority}, Dept=${result.detected_department}`);
        return result;
    } catch (err) {
        console.log(`⚠️  Gemini AI failed: ${err.message}, using keyword analysis`);
        return keywordAnalysis(desc, cat);
    }
}

function getSlaHours(priority) {
    return SLA_TIMES[priority] || 24;
}

function getSlaDeadline(priority) {
    const hours = getSlaHours(priority);
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hours);
    return deadline;
}

module.exports = { analyzeWithAI, routeComplaint, getSlaHours, getSlaDeadline };
