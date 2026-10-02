-- Erayah: release stock held by abandoned Razorpay checkouts.
-- Every 10 minutes, cancel pending_payment orders older than 30 minutes.

create extension if not exists pg_cron;

select cron.schedule(
  'expire-pending-orders',
  '*/10 * * * *',
  $$ select public.expire_pending_orders(interval '30 minutes'); $$
);
