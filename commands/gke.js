function createCluster(name, region, numNodes, minNodes, maxNodes) {
    return `gcloud container clusters create ${name} \
      --zone ${region} \
      --num-nodes ${numNodes} \
      --enable-autoscaling \
      --min-nodes ${minNodes} \
      --max-nodes ${maxNodes}`;
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
    # Create Gemini secret first
    kubectl create secret generic gemini-secret \
      --from-literal=api-key="${process.env.GEMINI_API_KEY}" \
      --namespace=default --dry-run=client -o yaml | kubectl apply -f - && \
    
    # Deploy Orbital components
    kubectl apply -f ./orbital-manifests/
  `;
}

function checkStatus() {
  return `
    echo "=== Bank of Anthos Status ===" && \
    kubectl get pods -l application=bank-of-anthos && \
    echo -e "\n=== Orbital Agent Status ===" && \
    kubectl get pods -l app=orbital-agent && \
    echo -e "\n=== Frontend Service ===" && \
    kubectl get service frontend
  `;
}

function deleteCluster(name, region) {
  return `gcloud container clusters delete ${name} --zone ${region} --quiet`;
}

  module.exports = { createCluster, getClusterCreds, deployBank };
  