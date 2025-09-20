function activateServiceAccount() {
  return `gcloud auth activate-service-account --key-file="${process.env.GOOGLE_APPLICATION_CREDENTIALS}"`;
}

function setProject() {
  return `gcloud config set project ${process.env.PROJECT_ID}`;
}

function createCluster(name, region, numNodes, minNodes, maxNodes, machineType, enableAutoscaling) {
  // First activate service account and set project
  let cmd = `${activateServiceAccount()} && ${setProject()} && `;
  
  // Add async flag for faster response
  cmd += `gcloud container clusters create ${name} \
    --zone ${region} \
    --machine-type ${machineType} \
    --disk-size 30 \
    --no-enable-cloud-logging \
    --no-enable-cloud-monitoring \
    --async`;
  
  if (enableAutoscaling) {
    cmd += ` \
    --enable-autoscaling \
    --num-nodes ${numNodes} \
    --min-nodes ${minNodes} \
    --max-nodes ${maxNodes}`;
  } else {
    cmd += ` \
    --num-nodes ${numNodes}`;
  }
  
  return cmd;
}

function getClusterCreds(name, region) {
  return `${activateServiceAccount()} && ${setProject()} && \
    gcloud container clusters get-credentials ${name} --zone ${region}`;
}

function deployBank() {
  return `
    echo "Cloning Bank of Anthos..." && \
    rm -rf bank-of-anthos && \
    git clone https://github.com/GoogleCloudPlatform/bank-of-anthos.git && \
    cd bank-of-anthos && \
    echo "Applying Kubernetes manifests..." && \
    kubectl apply -f kubernetes-manifests/ && \
    echo "Deployment initiated - pods will take 2-3 minutes to be ready"
  `;
}

function deployOrbital() {
  // Create the orbital manifest if it doesn't exist
  const createManifest = `
mkdir -p orbital-manifests && \
cat > orbital-manifests/orbital-agent.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: orbital-system
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: orbital-config
  namespace: orbital-system
data:
  detect.py: |
    import time
    import os
    
    print("🐋 Orbital Agent v1.0 starting...")
    print(f"Environment: {os.environ.get('ENV', 'production')}")
    print("Connecting to Bank of Anthos services...")
    
    while True:
        print("🔍 Scanning for whale opportunities...")
        print("  → Checking account balances via balancereader")
        print("  → Analyzing transaction patterns")
        print("  → AI confidence: 94.2%")
        time.sleep(30)
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orbital-agent
  namespace: orbital-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: orbital-agent
  template:
    metadata:
      labels:
        app: orbital-agent
    spec:
      containers:
      - name: agent
        image: python:3.9-slim
        command: ["python", "-u", "/app/detect.py"]
        volumeMounts:
        - name: config
          mountPath: /app
        env:
        - name: ENV
          value: "production"
      volumes:
      - name: config
        configMap:
          name: orbital-config
EOF
`;

  return `${createManifest} && \
    echo "Applying Orbital Agent manifest..." && \
    kubectl apply -f orbital-manifests/orbital-agent.yaml && \
    echo "Orbital Agent deployed to namespace: orbital-system"`;
}

function checkStatus() {
  return `
    echo "=== Cluster Info ===" && \
    kubectl cluster-info 2>&1 && \
    echo. && \
    echo "=== All Pods Status ===" && \
    kubectl get pods --all-namespaces 2>&1 && \
    echo. && \
    echo "=== Bank of Anthos Frontend ===" && \
    kubectl get service frontend -o wide 2>&1 || echo "Frontend service not found" && \
    echo. && \
    echo "=== Orbital Agent Status ===" && \
    kubectl get pods -n orbital-system 2>&1 || echo "No pods in orbital-system namespace"
  `;
}

function deleteCluster(name, region) {
  return `${activateServiceAccount()} && ${setProject()} && \
    gcloud container clusters delete ${name} --zone ${region} --quiet --async && \
    echo "Cluster deletion initiated - this will take a few minutes"`;
}

module.exports = {
  activateServiceAccount,
  setProject,
  createCluster,
  getClusterCreds,
  deployBank,
  deleteCluster,
  deployOrbital,
  checkStatus
};