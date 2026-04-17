# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment

- **DDEV project name:** `bott-drupal-testing`
- **Local URL:** https://bott-drupal-testing.ddev.site
- **PHP:** 8.4, **Web server:** nginx-fpm, **Database:** MariaDB 11.8
- **Drush prefix:** `ddev drush`

## Common Commands

```bash
# Start/stop environment
ddev start
ddev stop

# Run Drush commands
ddev drush <command>

# Install a contributed module
ddev composer require drupal/<module>
ddev drush en <module> -y

# Clear cache
ddev drush cr

# Config management (always in this order)
ddev drush config:import -y
ddev drush config:export -y
ddev drush config:status          # must show "No differences"

# Database operations
ddev drush sql:dump > backup.sql
ddev drush sql:cli

# Run updates after pulling code
ddev drush updatedb -y && ddev drush cr

# Get a one-time admin login link
ddev drush uli

# SSH into the web container
ddev ssh
```

## Project Structure

```
bott-drupal-testing/
├── composer.json          # Dependency management (use ddev composer, not composer directly)
├── vendor/                # PHP dependencies — never commit, never edit manually
├── web/                   # Document root (nginx serves from here)
│   ├── core/              # Drupal core — never modify
│   ├── modules/
│   │   ├── contrib/       # Contributed modules installed via Composer
│   │   └── custom/        # Custom modules you write
│   ├── themes/
│   │   ├── contrib/       # Contributed themes installed via Composer
│   │   └── custom/        # Custom themes you write
│   ├── profiles/          # Installation profiles
│   └── sites/default/
│       ├── settings.php        # Main settings — protected, minimal edits
│       ├── settings.ddev.php   # DDEV-injected DB credentials (auto-managed)
│       ├── files/              # User-uploaded content — never commit
│       └── config/sync/        # Exported config YAML — always commit
```

## Architecture Overview

**Drupal is a configuration-driven CMS.** The flow is:

1. **Content types / fields / views** are configured in the admin UI, then exported as YAML to `web/sites/default/files/sync/` via `drush config:export`.
2. Config YAML is committed to git and imported on other environments via `drush config:import`.
3. **Never hand-write config YAML** — always use the UI and export. UUIDs are generated automatically by config:export.
4. **Custom code** lives in `web/modules/custom/` (modules) and `web/themes/custom/` (themes). Each follows Drupal's `.info.yml` + hook-based pattern.
5. **Hook system:** Drupal modules extend behavior by implementing hooks (e.g., `hook_form_alter`, `hook_node_presave`) in `<module>.module` files.
6. **Services / dependency injection:** Business logic goes in PHP classes registered as services in `<module>.services.yml`, not in `.module` files.
7. **Routing:** URL paths are defined in `<module>.routing.yml` and map to controller classes.
8. **Theming:** Twig templates in `templates/` directories; preprocessor hooks in `<theme>.theme` file.

## Protected Files — Never Modify Without Explicit Approval

- `web/sites/default/settings.php`
- `web/sites/default/settings.ddev.php`
- `*.install` files (schema changes run only once via `updatedb`)
- Any `config_split` YAML

## Config Management Rules

1. Always `ddev drush config:import -y` before starting work
2. After any UI configuration change: `ddev drush config:export -y`
3. Always commit the exported config files — never hand-written YAML
4. Run `ddev drush config:status` to verify no drift before committing

## Composer Rules

- Always use `ddev composer` (not bare `composer`) to ensure correct PHP version
- Modules/themes go in their declared installer paths automatically (see `composer.json` `installer-paths`)
- Never copy module/theme files manually — always use Composer

---

## Drupal SDLC Plugin Configuration

- **GitHub:** Pulkit0111/bott-drupal-testing
- **Jira cloud ID:** 4dc444ec-d4ec-4f84-a629-1c755710b08c
- **Drush prefix:** `ddev drush`
- **Quality command:** not configured (add grumphp or a `quality` composer script to enable)

## Trigger Command
To start the full workflow:
```
work on jira ticket KEY-X
```

## AI Guardrails
- NEVER modify files not required by the current task
- Always show a diff before changes
- Always state risk level: Low / Medium / High
- NEVER write UUID values in config YAML

## Protected Files — NEVER modify without explicit approval
- web/sites/default/settings.php
- web/sites/default/settings.ddev.php
- *.install files
- config_split.config_split.*.yml

## Config Management — ALWAYS follow this order
1. ddev drush config:import -y
2. ddev drush config:export -y
3. ddev drush config:status (must show "No differences")
Always commit post-export files — never hand-written config YAML.

## Known Pitfalls
1. Never hand-craft UUIDs in config YAML — config:export adds them.
2. Never write inline login in Playwright tests — use loginAsAdmin() from helpers/auth.ts.
3. Always run config:export after config:import — commit exported version.
4. Save screenshots to tests/playwright/test-results/screenshots/.
5. Never use #edit-submit — use getByRole('button', { name: 'Save' }).
6. CKEditor body field — use page.getByRole('textbox', { name: 'Rich Text Editor' }).
7. Always post PR link back to Jira.
8. Jira Done transition is automatic — GitHub Action handles it on merge.
