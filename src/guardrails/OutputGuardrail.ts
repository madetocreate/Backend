// src/guardrails/OutputGuardrail.ts
export class OutputGuardrail {
  private blacklist = [/fuck|shit|dumm/i, /Geheimprojekt ABC/i]; // Beispielmuster

  validate(text: string): boolean {
    for (const regex of this.blacklist) {
      if (regex.test(text)) {
        console.warn("Guardrail: Verstoss gefunden ->", regex);
        return false;
      }
    }
    return true;
  }
}
