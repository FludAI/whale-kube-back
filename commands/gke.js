function createCluster(name, region, numNodes, minNodes, maxNodes, machineType, enableAutoscaling) {
  let cmd = `gcloud container clusters create ${name} \
    --zone ${region} \
    --machine-type ${machineType}`;
  
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
  return `gcloud container clusters get-credentials ${name} --zone ${region}`;
}

function deployBank() {
  return `
    rm -rf bank-of-anthos && \
    git clone https://github.com/GoogleCloudPlatform/bank-of-anthos.git && \
    cd bank-of-anthos && \
    kubectl apply -f kubernetes-manifests/
  `;
}

function deployOrbital() {
  return `
    kubectl create secret generic gemini-secret \
      --from-literal=api-key="${process.env.GEMINI_API_KEY}" \
      --namespace=default --dry-run=client -o yaml | kubectl apply -f - && \
    kubectl apply -f ./orbital-manifests/
  `;
}

function checkStatus() {
  return `
    echo "=== Bank of Anthos Status ===" && \
    kubectl get pods -l application=bank-of-anthos --no-headers | awk '{print $1":"$2":"$3}' && \
    echo "=== Orbital Agent Status ===" && \
    kubectl get pods -l app=orbital-agent --no-headers | awk '{print $1":"$2":"$3}' && \
    echo "=== Frontend Service ===" && \
    kubectl get service frontend -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
  `;
}

function deleteCluster(name, region) {
  return `gcloud container clusters delete ${name} --zone ${region} --quiet`;
}

module.exports = {
  createCluster,
  getClusterCreds,
  deployBank,
  deleteCluster,
  deployOrbital,
  checkStatus
};