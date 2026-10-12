# Phase 2 Features - Quick Start Guide

## 🚀 Getting Started with New Features

### 1️⃣ Document Management (Admin Only)

**Access:** Admin Dashboard → Documents Tab

**Upload a Document:**
1. Navigate to Documents tab or Employee → View → Documents
2. Click "Upload Document" button
3. Select document type (Contract, ID, Passport, etc.)
4. Enter document name
5. Choose file (max 10MB, PDF/DOC/JPG/PNG)
6. Optional: Set expiry date
7. Optional: Add notes
8. Click "Upload"

**Add Digital Signature:**
1. Find document in list
2. Click signature icon (pen)
3. Draw signature with mouse/touch
4. Click "Save Signature"

**Filter Documents:**
- Use search box for text search
- Filter by document type dropdown
- Filter by expiry status (Expiring Soon, Expired)

**Download/Delete:**
- Click "Download" to save locally
- Click trash icon to delete (with confirmation)

---

### 2️⃣ Advanced Analytics (Admin Only)

**Access:** Admin Dashboard → Analytics Tab

**Select Date Range:**
1. Click on date range button (default: last 3 months)
2. Select "From" date
3. Select "To" date
4. Click "Apply"

**Filter by Company:**
- Use company dropdown to filter specific company
- Select "All Companies" for organization-wide view

**Explore Different Views:**

**Trends Tab:**
- Monthly requests trend (area chart)
- Request types by month (bar chart)
- Visual identification of patterns

**Companies Tab:**
- Performance comparison table
- Total requests, approval rates
- Financial summaries per company

**Top Employees Tab:**
- Highest request volume employees
- Breakdown by approval status
- Total advances per employee

**Financial Tab:**
- Monthly advance amounts (line chart)
- Financial summary cards
- Total leave days taken

**Export Report:**
- Click "Export Excel" button
- Downloads CSV file with all company data
- Open in Excel/Google Sheets for further analysis

---

### 3️⃣ Enhanced Search & Filters (Admin Only)

**Access:** Admin Dashboard → Requests Tab

**Quick Text Search:**
1. Type in search box
2. Searches across: name, ID, amount, notes
3. Results update instantly

**Advanced Filtering:**
1. Click "Filters" button
2. Select multiple criteria:
   - **Request Types:** Leave, Advance, Entry (checkboxes)
   - **Status:** Pending, Approved, Rejected (checkboxes)
   - **Companies:** Select one or more companies
   - **Date Range:** Set from/to dates
   - **Amount Range:** Set min/max amounts
3. Filters apply automatically
4. Active filters shown as chips below search

**Remove Filters:**
- Click "X" on individual filter chips
- Or click "Clear all" in filter panel

**Save Filter Presets:**
1. Apply your desired filters
2. Click "Save Filter Preset"
3. Enter a name (e.g., "Pending Leave Requests")
4. Click "Save"
5. Preset appears in "Presets" dropdown

**Use Saved Presets:**
1. Click "Presets" button
2. Select preset from list
3. All filters apply instantly

**Star Favorites:**
1. Open "Presets" dropdown
2. Click star icon next to preset name
3. Starred presets appear in quick access bar below search
4. Click preset name for one-click loading

**Delete Presets:**
1. Open "Presets" dropdown
2. Click trash icon next to preset
3. Preset deleted from list

---

### 4️⃣ PWA - Install the App (All Users)

**On Desktop (Chrome/Edge):**
1. Visit the portal in browser
2. Wait 30 seconds (install prompt appears)
3. Click "Install" button
4. Or click install icon in address bar
5. App opens in standalone window

**On Android:**
1. Visit portal in Chrome
2. Wait for "Add to Home Screen" banner
3. Or tap menu → "Add to Home Screen"
4. Tap "Install"
5. App appears in app drawer

**On iOS (Safari):**
1. Visit portal in Safari
2. Tap Share button (square with arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. App appears on home screen

**Using Installed App:**
- Opens in standalone mode (no browser UI)
- Faster loading (cached assets)
- Works offline for previously visited pages
- Appears in taskbar/dock like native app

**Offline Mode:**
- App detects when you go offline (toast notification)
- Previously viewed pages still accessible
- Forms and new data require internet
- Syncs when connection restored

---

## 🔑 Keyboard Shortcuts (Future Enhancement)

Currently no keyboard shortcuts. Coming in Phase 3:
- `Ctrl/Cmd + K` - Quick search
- `Ctrl/Cmd + /` - Toggle filters
- `ESC` - Close modals
- Arrow keys - Navigate results

---

## 📱 Mobile Tips

**Document Upload on Mobile:**
- Use camera to capture documents directly
- Or select from photo gallery
- Reduce file size before upload if needed

**Signature on Mobile:**
- Works best in landscape orientation
- Use finger or stylus
- Zoom in for detailed signature

**Analytics on Mobile:**
- Charts are touch-scrollable
- Tables scroll horizontally
- Use landscape for better view

**Filters on Mobile:**
- Filters panel full-screen on mobile
- Scroll to see all options
- Active chips stack vertically

---

## ⚙️ Settings & Preferences

**Language:**
- Toggle between English/Arabic
- All new features fully bilingual
- RTL layout for Arabic

**Theme:**
- Toggle between light/dark mode
- All features support both themes
- Preference saved automatically

**Filter Presets:**
- Stored in browser (per device)
- Not synced across devices
- Clear browser data removes presets

---

## 🆘 Troubleshooting

**Problem:** Install prompt doesn't appear
**Solution:** 
- Ensure on HTTPS (not localhost)
- Wait 30 seconds
- Check browser supports PWA
- Click install icon in address bar

**Problem:** Documents not uploading
**Solution:**
- Check file size (<10MB)
- Verify file format (PDF/DOC/JPG/PNG)
- Check internet connection
- Try different file

**Problem:** Service worker not updating
**Solution:**
- Close all tabs
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Reopen portal

**Problem:** Filter presets disappeared
**Solution:**
- Check correct browser/device
- Stored in localStorage (per device)
- Browser privacy mode doesn't save
- Check browser data not cleared

**Problem:** Analytics charts not showing
**Solution:**
- Ensure requests exist in date range
- Try wider date range
- Check company filter
- Refresh page

**Problem:** Signature not saving
**Solution:**
- Ensure you drew something
- Try clearing and redrawing
- Check internet connection
- Try desktop if on mobile

---

## 💡 Pro Tips

**Documents:**
- Set expiry dates for all documents
- Review "Expiring Soon" filter monthly
- Use consistent naming convention
- Add detailed notes for context

**Analytics:**
- Export monthly reports for records
- Compare different date ranges
- Filter by company for deep dives
- Check trends tab for patterns

**Search:**
- Save frequently used filters
- Star daily-use presets
- Use amount range for financial reviews
- Combine multiple criteria for precision

**PWA:**
- Install on all devices you use
- Use offline for viewing only
- Update regularly for new features
- Keep browser updated

---

## 📞 Need Help?

**Documentation:**
- `/ENHANCEMENTS_PHASE2.md` - Full feature documentation
- `/IMPLEMENTATION_SUMMARY.md` - Executive overview
- `/ARCHITECTURE_PHASE2.md` - Technical details
- `/TROUBLESHOOTING.md` - Common issues

**For Admins:**
- Review analytics weekly
- Monitor expiring documents
- Clean up old filter presets
- Keep documents organized

**For Employees:**
- Install PWA for quick access
- Check documents regularly
- Review request history
- Update profile information

---

## 🎯 Best Practices

### Document Management
✅ Upload documents within 24 hours of receipt  
✅ Set expiry dates for all time-sensitive docs  
✅ Add digital signatures for legal documents  
✅ Review expiring documents monthly  
✅ Keep notes detailed and clear  

### Analytics
✅ Export monthly reports for record-keeping  
✅ Review trends before policy changes  
✅ Compare year-over-year data  
✅ Share insights with management  
✅ Use for budget planning  

### Search & Filters
✅ Save frequently used filter combinations  
✅ Star daily-use presets  
✅ Name presets descriptively  
✅ Clean up unused presets quarterly  
✅ Use specific criteria for faster results  

### PWA
✅ Install on primary work devices  
✅ Keep app updated  
✅ Clear cache if experiencing issues  
✅ Use offline mode only for viewing  
✅ Sync regularly when online  

---

**Happy using the new features! 🎉**

For detailed information, see `/ENHANCEMENTS_PHASE2.md`
