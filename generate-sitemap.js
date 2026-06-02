const fs = require('fs');
const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ─── دالة تنظيف النص (تمسح الإيموجيز والرموز غير المدعومة) ───
const escapeXML = (str) => {
    if (!str) return '';
    
    // 1. مسح الإيموجيز والرموز غير المدعومة في XML
    let cleanStr = str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''); 
    
    // 2. تحويل الرموز الخاصة لـ XML
    return cleanStr
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

async function generateSitemap() {
    // تحديد الترميز UTF-8 صراحة لجوجل
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    xml += `  <url>\n    <loc>https://kerollosatnass.github.io/</loc>\n    <priority>1.0</priority>\n  </url>\n`;

    // ─── 1. سحب الشهادات (شفاط كامل لكل الصور) ───
    xml += `  <url>\n    <loc>https://kerollosatnass.github.io/?tab=certs</loc>\n    <priority>0.9</priority>\n`;
    const certsSnap = await db.collection('Verified-Certifications').get();
    
    certsSnap.forEach(doc => {
        const data = doc.data();
        
        // مصفوفة بكل أسماء الحقول المحتملة
        const possibleImageFields = ['Image URL', 'Image Url', 'imageUrl', 'image', 'Image', 'awardImage', 'URL', 'url'];
        let foundImages = [];
        
        // تجميع الصور من الحقول الفردية
        for (let field of possibleImageFields) {
            if (data[field]) foundImages.push(data[field]);
        }
        
        // تجميع الصور لو كانت في مصفوفة (Array)
        if (data.images && Array.isArray(data.images)) {
            foundImages = [...foundImages, ...data.images];
        }

        // إزالة الصور المتكررة
        const uniqueImages = [...new Set(foundImages)];

        uniqueImages.forEach(imgUrl => {
            if (imgUrl && typeof imgUrl === 'string') {
                xml += `    <image:image>\n      <image:loc>${escapeXML(imgUrl)}</image:loc>\n      <image:title>Kerollos Atnass - Professor Owl - كيرلس أطناس</image:title>\n      <image:caption>${escapeXML(data.Title || data.title || 'Certification')} - Kerollos Atnass (Professor Owl - كيرلس اطناس)</image:caption>\n    </image:image>\n`;
            }
        });
    });
    xml += `  </url>\n`;

    // ─── 2. سحب الأخبار (شفاط كامل لكل الصور) ───
    xml += `  <url>\n    <loc>https://kerollosatnass.github.io/?tab=news</loc>\n    <priority>0.9</priority>\n`;
    const newsSnap = await db.collection('news').get();
    
    newsSnap.forEach(doc => {
        const data = doc.data();
        
        let newsImages = [];
        
        if (data.images && Array.isArray(data.images)) {
            newsImages = [...data.images];
        }
        if (data.image) newsImages.push(data.image);
        if (data['Image URL']) newsImages.push(data['Image URL']);
        if (data.imageUrl) newsImages.push(data.imageUrl);

        // إزالة الصور المتكررة
        const uniqueNewsImages = [...new Set(newsImages)];

        uniqueNewsImages.forEach(imgUrl => {
            if (imgUrl && typeof imgUrl === 'string') {
                xml += `    <image:image>\n      <image:loc>${escapeXML(imgUrl)}</image:loc>\n      <image:title>Kerollos Atnass - Professor Owl - كيرلس أطناس</image:title>\n      <image:caption>${escapeXML(data.title || data.Title || 'News Update')} - Kerollos Atnass (Professor Owl - كيرلس اطناس)</image:caption>\n    </image:image>\n`;
            }
        });
    });
    xml += `  </url>\n`;

    // سطر الوقت لضمان تغيير الملف في كل مرة يشتغل فيها الروبوت (لمنع تعليق الجيت هب)
    xml += `  \n`;
    xml += `</urlset>`;
    
    fs.writeFileSync('./sitemap.xml', xml);
    process.exit(0);
}

generateSitemap().catch(console.error);
