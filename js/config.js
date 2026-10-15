/* Supabase connection. The anon key is a public key and is safe to ship in the browser:
   what it can do is limited by the row level security rules in supabase/schema.sql.
   Never put the service_role / secret key here. */
window.COLLABZ_CONFIG = {
  url: 'https://kttwxlhqgyrhrugvboys.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dHd4bGhxZ3lyaHJ1Z3Zib3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDY5NzcsImV4cCI6MjEwNzYyMjk3N30.7gc0AhMRgIBiKMnDllVp4QUr0-eh5mdQhjjzjTgzJw0'
};
