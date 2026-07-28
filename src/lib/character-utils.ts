export type CharacterFields = {
  name: string;
  age: string;
  appearance: string;
  personality: string;
  goal: string;
  relationships: string;
};

const FIELD_KEYS: { key: keyof Omit<CharacterFields, "name">; labels: string[] }[] = [
  { key: "age", labels: ["나이"] },
  { key: "appearance", labels: ["외모"] },
  { key: "personality", labels: ["성격"] },
  { key: "goal", labels: ["목표"] },
  { key: "relationships", labels: ["관계"] },
];

// Parses the "- 나이: ...\n- 외모: ...\n" field lines out of a character
// sheet written from CHARACTER_TEMPLATE, so they can be shown as a table.
// Sheets that don't follow the template just end up with blank fields.
export function parseCharacterSheet(content: string, fallbackName: string): CharacterFields {
  const heading = content.match(/^#\s+(.+)$/m);
  const fields: CharacterFields = {
    name: heading ? heading[1].trim() : fallbackName,
    age: "",
    appearance: "",
    personality: "",
    goal: "",
    relationships: "",
  };

  for (const line of content.split("\n")) {
    const match = line.match(/^-\s*([^:：]+)[:：]\s*(.*)$/);
    if (!match) continue;
    const [, rawLabel, value] = match;
    const label = rawLabel.trim();
    const field = FIELD_KEYS.find((f) => f.labels.includes(label));
    if (field && value.trim()) {
      fields[field.key] = value.trim();
    }
  }

  return fields;
}
