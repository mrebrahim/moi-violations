
const express = require("express");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Supabase config
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.get("/", async (req, res) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://portal.moi.gov.ae/eservices/TrafficServices/Fines/TrafficFinesPayment.aspx");

    // اضغط زر تسجيل الدخول بالهوية الرقمية
    await page.click("text=تسجيل الدخول بالهوية الرقمية");

    // استنى الكود يظهر
    await page.waitForTimeout(5000);
    const content = await page.content();
    const otpMatch = content.match(/(?:OTP|رمز الدخول).*?(\d{2})/);

    const otp = otpMatch ? otpMatch[1] : "??";

    // استنى المستخدم يوافق في التطبيق
    await page.waitForTimeout(15000);

    // ارجع لنفس الصفحة بعد تسجيل الدخول
    await page.goto("https://portal.moi.gov.ae/eservices/TrafficServices/Fines/TrafficFinesPayment.aspx");

    await page.waitForLoadState("networkidle");

    // استخراج بيانات المخالفات (تجريبية)
    const violations = await page.$$eval(".ViolationDetails", nodes =>
      nodes.map(n => n.innerText)
    );

    await supabase.from("violations").insert([{ data: violations.join("\n") }]);

    await browser.close();
    res.json({ otp, violations });
  } catch (err) {
    await browser.close();
    res.status(500).send("Error: " + err.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
