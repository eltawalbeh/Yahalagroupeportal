# Email Template Color Update Script

## Colors to Replace:

Replace ALL instances of `#7AC143` with `#60AA24` in `/supabase/functions/server/email-service.tsx`

## Portal URL to Update:

All portal URLs should use: `https://portal.yahala.co`

Currently the templates use `${data.portalUrl}` which is good - just ensure the data passed includes the correct URL.

## Manual Update Instructions:

Since the file is large (40 instances of #7AC143), use your code editor's find & replace:

1. Open `/supabase/functions/server/email-service.tsx`
2. Find: `#7AC143`
3. Replace with: `#60AA24`
4. Replace All (40 instances)
5. Save file

## Verification:

After replacement, search for `#7AC143` - should find 0 results.
Search for `#60AA24` - should find 40 results.

Done!
