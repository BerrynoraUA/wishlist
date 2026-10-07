-- Review cards the user cancels are recorded, so a cancelled change can never be confirmed later.
alter table public.mcp_actions drop constraint mcp_actions_status_check;
alter table public.mcp_actions add constraint mcp_actions_status_check
  check (status in ('pending', 'executing', 'completed', 'failed', 'cancelled'));
