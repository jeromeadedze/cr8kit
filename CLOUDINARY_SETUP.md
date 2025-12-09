# Cloudinary Setup Guide

## Step 1: Create Upload Preset in Cloudinary Dashboard

1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Navigate to **Settings** > **Upload** > **Upload presets**
3. Click **Add upload preset**
4. Configure the preset:
   - **Preset name**: `cr8kit_equipment`
   - **Signing mode**: Select **Unsigned** (for client-side uploads)
   - **Folder**: `cr8kit/equipment`
   - **Upload manipulations**:
     - Width: 1200
     - Height: 800
     - Crop: Limit
     - Quality: Auto:good
     - Format: Auto
   - **Allowed formats**: jpg, jpeg, png, webp
   - **Max file size**: 5MB
5. Click **Save**

## Step 2: Verify Configuration

Your Cloudinary credentials are already configured in the code:

- **Cloud Name**: `dpfsqrccq`
- **API Key**: `112636816111282`
- **API Secret**: `cEw7KjShBu5DHChwqAUE3xvLDRA`

## Image Optimization Features

All images uploaded through Cloudinary are automatically optimized:

1. **Automatic Format Conversion**: Images are converted to WebP when supported by the browser
2. **Quality Optimization**: Uses `auto:good` quality setting for optimal file size vs quality
3. **Responsive Images**: Uses `dpr_auto` for high-DPI displays
4. **Lazy Loading**: Images load as they come into view
5. **Multiple Sizes**:
   - Thumbnails: 300x200px (for cards)
   - Medium: 800x600px (for previews)
   - Full: 1200x800px (for detail pages)

## Usage

### Uploading Images

1. Go to the "List Your Gear" page
2. Click "Add Photo" on any photo slot
3. Select or take a photo
4. Crop if needed (3:2 aspect ratio recommended)
5. Image is automatically uploaded and optimized

### Displaying Images

Images are automatically served with optimized URLs:

- Card images: `w_280,h_200,c_fill,q_auto:good,f_auto`
- Detail images: `w_1200,h_800,c_limit,q_auto:good,f_auto`

## Testing

To test the integration:

1. Open `list-item.html` in your browser
2. Click "Add Photo" button
3. Upload an image
4. Verify the image appears in the preview
5. Check the browser console for any errors

## Troubleshooting

If uploads fail:

1. Verify the upload preset name matches `cr8kit_equipment`
2. Check that the preset is set to "Unsigned"
3. Verify folder permissions in Cloudinary
4. Check browser console for error messages
