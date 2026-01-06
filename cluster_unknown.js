import fs from "fs";
import { getEmbedding } from "./fixed_calculations/embedder.js";
import { cosineSimilarity } from "./fixed_calculations/similarity.js";

const CLUSTER_THRESHOLD = 0.75;

async function clusterUnknowns() {
  const raw = fs.readFileSync("unknown_inputs.json");
  const unknowns = JSON.parse(raw);

  const clusters = [];

  for (const item of unknowns) {
    const vector = await getEmbedding(item.text);
    let placed = false;

    for (const cluster of clusters) {
      const similarity = cosineSimilarity(vector, cluster.centroid);

      if (similarity >= CLUSTER_THRESHOLD) {
        cluster.items.push(item.text);

        // update centroid (simple average)
        cluster.centroid = cluster.centroid.map(
          (v, i) => (v * (cluster.items.length - 1) + vector[i]) / cluster.items.length
        );

        placed = true;
        break;
      }
    }

    if (!placed) {
      clusters.push({
        centroid: vector,
        items: [item.text]
      });
    }
  }

  return clusters;
}

(async () => {
  const clusters = await clusterUnknowns();

  console.log("\n📊 Unknown Input Clusters:\n");

  clusters.forEach((cluster, i) => {
    console.log(`Cluster ${i + 1}:`);
    cluster.items.forEach(text => console.log("  -", text));
    console.log("");
  });
})();
