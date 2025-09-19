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
  const { name, region, numNodes, minNodes, maxNodes } = req.body;
  runCommand(
    createCluster(name, region, numNodes, minNodes, maxNodes),
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

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});
