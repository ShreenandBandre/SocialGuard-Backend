require("dotenv").config(); // Load environment variables
const express = require("express");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const app = express();
const PORT = 3000;

// --- Supabase Configuration ---
// Using environment variables from .env file
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// --- End Supabase Configuration ---

app.use(express.static('public'));

// Add a new endpoint to provide Supabase credentials to the frontend
app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY
  });
});

// Replace with your final destination
const FINAL_URL = "/login.html";

app.get("/", async (req, res) => {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress.replace("::ffff:", ""); // clean IPv4
  const user_agent = req.headers["user-agent"];
  const timestamp = new Date().toISOString();

  let location = "Unknown";
  let city = "Unknown";
  let country = "Unknown";
  let isp = "Unknown";

  try {
    // Call ip-api for location using axios
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    const data = response.data;

    if (data.status === "success") {
      city = data.city;
      country = data.country;
      isp = data.isp;
      location = `${data.city}, ${data.country} (ISP: ${data.isp})`;
    }
  } catch (err) {
    console.error("Geo lookup failed:", err.message);
  }

  const logEntry = `${timestamp} | IP: ${ip} | Location: ${location} | UA: ${user_agent}\n`;

  // Print to console for local logging
  console.log(logEntry);

  // --- Send data to Supabase ---
  try {
    const { data, error } = await supabase
      .from('visitor_logs') // MAKE SURE this table name matches your Supabase table
      .insert([
        {
          ip_address: ip,
          user_agent: user_agent,
          timestamp: timestamp,
          location: location,
          city: city,
          country: country,
          isp: isp,
        },
      ]);

    if (error) {
      throw error;
    }

    console.log("Data successfully sent to Supabase:", data);
  } catch (error) {
    console.error("Error sending data to Supabase:", error.message);
  }
  // --- End Supabase logic ---


  // Redirect to final site
  res.redirect(FINAL_URL);
});

app.listen(PORT, () => {
  console.log(`Tracker running at http://localhost:${PORT}`);
});
