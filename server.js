const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const { createCluster, getClusterCreds, deployBank } = require("./commands/gke");

const app = express();
app.use(cors({ origin: "*" })); // allow all for dev, tighten later
app.use(bodyParser.json());

function runCommand(cmd, res, successMsg) {
  exec(cmd, { shell: "/bin/bash" }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr || err.message });
    }
    res.json({ message: successMsg, output: stdout });
  });
}

app.post("/api/create-cluster", (req, res) => {
  const { name, region, numNodes, minNodes, maxNodes, machineType, enableAutoscaling } = req.body;
  runCommand(
    createCluster(name, region, numNodes, minNodes, maxNodes, machineType, enableAutoscaling),
    res,
    `Cluster ${name} created`
  );
});

app.post("/api/get-credentials", (req, res) => {
  const { name, region } = req.body;
  runCommand(getClusterCreds(name, region), res, `Credentials fetched`);
});

app.post("/api/deploy-bank", (req, res) => {
  runCommand(deployBank(), res, `Bank of Anthos deployed`);
});

// Add this endpoint
app.post("/api/gemini-chat", async (req, res) => {
  const { message, context } = req.body;
  
  try {
    // In production, call actual Gemini API
    // For now, simple responses
    const responses = {
      "deploy": "To deploy Bank of Anthos, click the deployment buttons in order: Create Cluster → Get Credentials → Deploy Bank",
      "error": "Check the console output for error details. Common issues include authentication or quota limits.",
      "status": "Use the Check Status button to see pod statuses and get the frontend IP address.",
    };
    
    // Simple keyword matching for demo
    const keyword = Object.keys(responses).find(k => message.toLowerCase().includes(k));
    const response = responses[keyword] || "I can help with Bank of Anthos deployment. What would you like to know?";
    
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: "Gemini chat failed" });
  }
});

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});

