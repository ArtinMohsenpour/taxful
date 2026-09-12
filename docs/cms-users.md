# CMS users

Users are Payload staff accounts, separate from the future client portal.

- **Super admin (Owner):** manages all staff and content, including granting owner access. The existing owner account (ID 1) has this role.
- **Manager:** manages users and website content, but cannot assign Super admin or update/delete owner accounts.
- **Content editor:** edits website content and their own profile; cannot view other staff profiles, create/delete users, or change roles.

Role is required and defaults to Content editor for new accounts. First name, last name, profile image, phone number, and all address fields are optional. First and last name appear as separate columns in the staff list. Address uses separate street, address line 2, postal code, city, and country fields. Postal codes and phone numbers are text to preserve leading zeros and international formats. Profile images use Media, whose assets are public; profile records, phone numbers, and addresses require authorized access.

Staff cannot delete themselves or change their own role. Only another Super admin may change an owner's role. First-user setup on a fresh database assigns Super admin. The owner-role migration promotes the oldest existing Manager account; account 1 was the only existing local account and was verified as Super admin.

The `20260912_191057_super_admin_role` migration was applied to the existing local database. Like the earlier migrations, do not replay it there before resolving migration-history baselining. Rolling it back maps Super admins to Managers.

`20260912_190054_cms_user_profiles` is additive. Its SQL was applied directly to the existing local development database, which still needs migration-history baselining as described in `navbar.md`; do not replay this migration there. Fresh databases should run the full migration sequence.

User versioning remains disabled. Access tests run in rollback-only transactions.
