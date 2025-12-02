// src/tools/CodeExecTool.ts
import { exec } from "child_process";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";

export interface ExecResult {
  stdout?: string;
  error?: string;
  imagePath?: string;
}

export class CodeExecTool {
  async run(pythonCode: string): Promise<ExecResult> {
    const id = uuidv4();
    const codeFile = `/tmp/code_${id}.py`;
    await fs.writeFile(codeFile, pythonCode, "utf-8");

    return new Promise<ExecResult>((resolve) => {
      // Docker ausführen mit eingeschränkter Umgebung
      const cmd = `docker run --rm -v /tmp:/app -w /app python:3.10 python ${codeFile}`;
      exec(cmd, { timeout: 10000 }, async (err, stdout, stderr) => {
        const result: ExecResult = {};

        if (err) {
          result.error = stderr || err.message;
        } else {
          result.stdout = stdout;
        }

        // Falls der Code eine Datei "scatter.png" angelegt hat (Beispiel aus Prompt):
        try {
          await fs.stat("/tmp/scatter.png");
          // Move or store image to static folder
          const targetPath = `public/plots/scatter_${id}.png`;
          await fs.rename("/tmp/scatter.png", targetPath);
          result.imagePath = `/plots/scatter_${id}.png`;
        } catch {}

        // Aufräumen: Code-Datei löschen
        await fs.unlink(codeFile).catch(() => {});
        resolve(result);
      });
    });
  }
}
