/** `**粗體**` → <strong>。Sky Lab 正文只用呢一種標記。 */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
    </>
  );
}
