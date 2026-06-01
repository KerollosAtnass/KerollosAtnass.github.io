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

const escapeXML = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
};

async function generateSitemap() {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    xml += `  <url>\n    <loc>https://kerollosatnass.github.io/</loc>\n    <priority>1.0</priority>\n  </url>\n`;

    // ─── 1. سحب الشهادات (بذكاء) ───
    xml += `  <url>\n    <loc>https://kerollosatnass.github.io/?tab=certs</loc>\n    <priority>0.9</priority>\n`;
    const certsSnap = await db.collection('Verified-Certifications').get();
    certsSnap.forEach(doc => {
        const data = doc.data();
        
        // صائد الصور: بيبحث في كل المسميات المحتملة اللي ممكن تكون متسجلة في الداتابيز
        let imgUrl = data['Image URL'] || data['Image Url'] || data.imageUrl || data.image || data.Image || data.awardImage;
        
        // لو الصورة متخزنة في Array بالغلط
        if (!imgUrl && data.images && data.images.length > 0) {
            imgUrl = data.images[0];
        }

        if (imgUrl) {
            xml += `    <image:image>\n      <image:loc>${escapeXML(imgUrl)}</image:loc>\n      <image:title>Kerollos Atnass - Professor Owl - كيرلس أطناس</image:title>\n      <image:caption>${escapeXML(data.Title || data.title || 'Certification')} - Kerollos Atnass (Professor Owl - كيرلس اطناس)</image:caption>\n    </image:image>\n`;
        }
    });
    xml += `  </url>\n`;

    // ─── 2. سحب الأخبار (بذكاء) ───
    xml += `  <url>\n    <loc>https://kerollosatnass.github.io/?tab=news</loc>\n    <priority>0.9</priority>\n`;
    const newsSnap = await db.collection('news').get();
    newsSnap.forEach(doc => {
        const data = doc.data();
        
        // تجميع كل الصور للخبر من أي حقل محتمل
        let newsImages = [];
        if (data.images && Array.isArray(data.images)) {
            newsImages = data.images;
        } else if (data.image) {
            newsImages = [data.image];
        } else if (data['Image URL'] || data.imageUrl) {
            newsImages = [data['Image URL'] || data.imageUrl];
        }

        if (newsImages.length > 0) {
            newsImages.forEach(imgUrl => {
                if (imgUrl) {
                    xml += `    <image:image>\n      <image:loc>${escapeXML(imgUrl)}</image:loc>\n      <image:title>Kerollos Atnass - Professor Owl - كيرلس أطناس</image:title>\n      <image:caption>${escapeXML(data.title || data.Title || 'News Update')} - Kerollos Atnass (Professor Owl - كيرلس اطناس)</image:caption>\n    </image:image>\n`;
                }
            });
        }
    });
    xml += `  </url>\n`;

    xml += `</urlset>`;
    
    fs.writeFileSync('./sitemap.xml', xml);
    process.exit(0);
}

generateSitemap().catch(console.error);
