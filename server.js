const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const { createCluster, getClusterCreds, deployBank, deleteCluster, deployOrbital, checkStatus } = require("./commands/gke");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// Debug logging
console.log("Current directory:", __dirname);
console.log("Looking for credentials...");

if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  console.log("Found GOOGLE_APPLICATION_CREDENTIALS_JSON env var");
  const credPath = path.join(__dirname, ".gcp-temp-creds.json");
  fs.writeFileSync(credPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
} else {
  const parentPath = path.join(__dirname, '../bondswipe-ts-ba26d9691a4a.json');
  console.log("Checking for file at:", parentPath);
  console.log("File exists?", fs.existsSync(parentPath));
  
  if (fs.existsSync(parentPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = parentPath;
    console.log("✓ Using credentials from parent directory");
    console.log("GOOGLE_APPLICATION_CREDENTIALS set to:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } else {
    console.log("❌ No credentials file found");
  }
}

console.log("PROJECT_ID:", process.env.PROJECT_ID);

function runCommand(cmd, res, successMsg) {
  console.log("Executing command:", cmd.substring(0, 200) + "...");
  
  exec(cmd, { 
    shell: true,
    maxBuffer: 1024 * 1024 * 10,
    windowsHide: true
  }, (err, stdout, stderr) => {
    console.log("Command completed");
    const output = stdout || stderr || "No output returned";
    console.log("Output:", output.substring(0, 500));
    
    if (err && !stdout && !stderr) {
      console.error('Command error:', err.message);
      return res.status(500).json({ 
        error: err.message,
        message: "Command failed - check console"
      });
    }
    
    res.json({ 
      message: successMsg, 
      output: output,
      details: err ? err.message : ""
    });
  });
}

// Auth status endpoint
app.get("/api/auth-status", (req, res) => {
  const hasAuth = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.PROJECT_ID || "not-set";
  res.json({ 
    authenticated: hasAuth,
    projectId: projectId,
    credentialsType: hasAuth ? "Service Account" : "None"
  });
});

// Cluster operations
app.post("/api/create-cluster", (req, res) => {
  const { name, region, numNodes, minNodes, maxNodes, machineType, enableAutoscaling } = req.body;
  console.log("Creating cluster with params:", { name, region, numNodes, machineType });
  
  runCommand(
    createCluster(name, region, numNodes, minNodes, maxNodes, machineType, enableAutoscaling),
    res,
    `Cluster ${name} creation started`
  );
});

app.post("/api/get-credentials", (req, res) => {
  const { name, region } = req.body;
  console.log("Getting credentials for:", name);
  runCommand(getClusterCreds(name, region), res, `Credentials fetched for ${name}`);
});

app.post("/api/deploy-bank", (req, res) => {
  console.log("Deploying Bank of Anthos...");
  runCommand(deployBank(), res, `Bank of Anthos deployment started`);
});

app.post("/api/deploy-orbital", (req, res) => {
  console.log("Deploying Orbital Agent...");
  runCommand(deployOrbital(), res, "Orbital Agent deployment started");
});

app.post("/api/check-status", (req, res) => {
  console.log("Checking cluster status...");
  runCommand(checkStatus(), res, "Status check completed");
});

app.post("/api/delete-cluster", (req, res) => {
  const { name, region } = req.body;
  console.log("Deleting cluster:", name);
  runCommand(deleteCluster(name, region), res, `Cluster ${name} deletion started`);
});

// Gemini chat endpoint
app.post("/api/gemini-chat", async (req, res) => {
  const { message, context } = req.body;
  
  try {
    const responses = {
      "deploy": "To deploy Bank of Anthos, click the deployment buttons in order: Create Cluster → Get Credentials → Deploy Bank",
      "error": "Check the console output for error details. Common issues include authentication or quota limits.",
      "status": "Use the Check Status button to see pod statuses and get the frontend IP address.",
      "online boutique": "Online Boutique can be integrated with Bank of Anthos to show e-commerce transaction flow!",
    };
    
    const keyword = Object.keys(responses).find(k => message.toLowerCase().includes(k));
    const response = responses[keyword] || "I can help with Bank of Anthos deployment. What would you like to know?";
    
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: "Gemini chat failed" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Google Cloud Project: ${process.env.PROJECT_ID}`);
  console.log(`Credentials loaded: ${!!process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
});