# Adding an admin

Admins are identified by Discord user ID and gated through the
`ADMIN_DISCORD_IDS` environment variable.

1. Start a Discord app and enable **Developer Mode** on your account.
2. Right-click any user → **Copy User ID**.
3. Set the variable in Railway:

   ```
   ADMIN_DISCORD_IDS=111111111111111111,222222222222222222
   ```

4. Restart the service. Admins get access to `/admin` (backup / restore /
   clear whiteboard).
