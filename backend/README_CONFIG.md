# Environment Configuration

This system allows you to easily switch between local development and live production environments by changing a single setting.

## How to Switch Environments

1. Open the `.env` file in the backend directory
2. Change the `ENVIRONMENT` variable:
   - `ENVIRONMENT=local` for local development
   - `ENVIRONMENT=live` for production/live environment
3. Save the file and restart your server

## Current Configuration

### Live/Production Environment
- Database Name: `realgiveaways_inventory`
- Database User: `realgiveaways_inventory`
- Database Password: `!nv3T0rY`
- App Secret: `inventory-saas-secret-key-change-in-production`

### Simple Login Fallback (Live)
- When the database is unavailable or credentials fail, login accepts any username with the password equal to `APP_SECRET`.
- This is enabled only in `live` environment to avoid lockouts on cPanel.
- Tokens are generated using HMAC with `APP_SECRET`, and all authenticated requests continue to verify tokens normally.

### Local Development Environment
- Database Name: `inventory`
- Database User: `inv_user`
- Database Password: `inv_pass`
- App Secret: `local-inventory-secret-key`

## Testing the Configuration

To verify which environment is active, you can temporarily add this code to any PHP file:

```php
echo "Current Environment: " . CURRENT_ENVIRONMENT . "\n";
echo "Database: " . DB_NAME . "\n";
echo "User: " . DB_USER . "\n";
```

## Notes

- The system defaults to `live` environment if the `.env` file is missing or the `ENVIRONMENT` variable is not set
- All database credentials and secrets are managed through this configuration system
- Do not commit sensitive information to version control