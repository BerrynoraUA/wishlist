import Link from "next/link";

export default function Landing() {
  return (
    <main style={styles.container}>
      <h1>Welcome 👋</h1>
      <p>This is a clean Next.js starter.</p>
      <Link href="/login">Go to Login</Link>
    </main>
  );
}

const styles = {
  container: {
    padding: "2rem",
  },
};
