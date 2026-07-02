import fs from "fs";
import path from "path";

const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/ShareToken.sol/ShareToken.json"
);

const outputPath = path.join(
  __dirname,
  "../../backend/src/blockchain/abi/ShareToken.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(artifact.abi, null, 2));

console.log("✅ ABI exported to backend/src/blockchain/abi/ShareToken.json");