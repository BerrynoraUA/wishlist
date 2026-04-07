type Props = {
  children: React.ReactNode;
  /** Custom message shown on the locked overlay */
  message?: string;
};

export function ProGate({ children }: Props) {
  return <>{children}</>;
}
