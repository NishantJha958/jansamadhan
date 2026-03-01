const router = require('express').Router();
const axios = require('axios');

const SUPPORTED_LANGUAGES = {
    en: { name: 'English', native: 'English', flag: '🇬🇧' },
    hi: { name: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
    mr: { name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
    ta: { name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
    te: { name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
    bn: { name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
    gu: { name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
    kn: { name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
    ml: { name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
    pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    or: { name: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
    as: { name: 'Assamese', native: 'অসমীয়া', flag: '🇮🇳' },
    ur: { name: 'Urdu', native: 'اردو', flag: '🇮🇳' },
};

router.get('/languages', (req, res) => {
    res.json({ success: true, languages: SUPPORTED_LANGUAGES, translation_available: true });
});

// Google Translate free endpoint
router.post('/translate', async (req, res) => {
    try {
        const { text, from = 'auto', to = 'en' } = req.body;
        if (!text) return res.json({ success: true, translated: text });
        if (from === to) return res.json({ success: true, translated: text });

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await axios.get(url, { timeout: 5000 });
        const translated = response.data[0]?.map(t => t[0]).join('') || text;
        res.json({ success: true, translated, from, to });
    } catch (err) {
        res.json({ success: false, translated: text, message: err.message });
    }
});

module.exports = router;
