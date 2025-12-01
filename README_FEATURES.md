# AI Data Center Explorer - Feature Guide

## 🎯 Overview

This interactive visualization dashboard helps potential investors identify optimal locations for building AI data centers. It uses comprehensive country-level data from the CIA World Factbook to analyze three key aspects: **Accessibility**, **Profitability**, and **Efficiency**.

## 🚀 Getting Started

### First Launch
When you first open the application, an interactive tutorial will guide you through all features. You can:
- Navigate through tutorial steps
- Skip the tutorial (it won't show again)
- Manually trigger it later by clearing localStorage

### Quick Start
1. **Explore the Map**: Click on any country to see detailed information
2. **Use Filters**: Adjust sliders in the left panel to filter countries
3. **Compare Attributes**: Use the Parallel Coordinates plot to compare multiple metrics
4. **Analyze Relationships**: Use the Scatter Plot to explore correlations
5. **View Rankings**: Check the bar charts for top performers

## 📊 Main Components

### 1. Interactive World Map (Center)
**Features:**
- Full country polygons (not just dots!)
- Color-coded by selected metric
- Click to select and zoom to countries
- Hover for quick information
- Smooth zoom and pan

**How to Use:**
- Click any country to select it
- Selected country is highlighted across ALL visualizations
- Map automatically zooms to selected country
- Popup shows key metrics

### 2. Filter Panel (Left Sidebar)
**Available Filters:**
- Renewable Energy % (0-100%)
- Electricity Cost ($/kWh)
- Average Temperature (-20°C to 50°C)
- GDP per Capita ($0-$100,000)
- Internet Speed (0-1000 Mbps)

**Features:**
- Real-time filtering
- Reset button to clear all filters
- Filtered countries highlighted in visualizations

### 3. Interactive Parallel Coordinates (Bottom Right)
**What It Shows:**
Compare multiple attributes simultaneously for all countries.

**Features:**
- **Add Attributes**: Click dropdown to add more metrics
- **Remove Attributes**: Click X on attribute chips (minimum 2 required)
- **Click Lines**: Select countries by clicking their lines
- **Hover**: See country names
- **Color Coding**:
  - Blue: Highlighted/filtered countries
  - Cyan: Selected country
  - Gray: Other countries

**Available Attributes (20+):**
- Economic: GDP per Capita, GDP Growth, Unemployment
- Demographics: Population Growth, Median Age, Density
- Energy: Electricity Access, Capacity per Capita
- Connectivity: Internet Users, Broadband, Mobile
- Transportation: Road, Rail, Airport Density
- Environmental: CO₂ per Capita, CO₂ per GDP
- Geography: Temperature, Water Share, Coastline

### 4. Enhanced Scatter Plot (Bottom Left)
**What It Shows:**
3-dimensional comparison with bubble size representing a third variable.

**Features:**
- **Choose X-Axis**: Select any attribute
- **Choose Y-Axis**: Select any attribute
- **Choose Bubble Size**: Select any attribute
- **Click Bubbles**: Select countries
- **Color Coding**: Same as parallel coordinates
- **Zoom & Pan**: Explore data clusters

**Use Cases:**
- Find correlations (e.g., GDP vs CO₂)
- Identify outliers
- Explore trade-offs (e.g., high capacity but high emissions)

### 5. Top Countries Bar Chart (Top Left)
**Features:**
- Shows top 10 countries by selected metric
- Click bars to select countries
- Horizontal layout for easy reading
- Active country highlighted in cyan

### 6. Metrics Distribution (Bottom)
**Features:**
- Shows distribution of key metrics
- Helps understand data ranges
- Identifies outliers

### 7. Score Breakdown (Top Right)
**Features:**
- Overall suitability scores
- Category breakdowns
- Quick comparison view

## 🎨 Interaction Patterns

### Click-to-Focus
**Works Everywhere:**
1. Click a country on the map → Selected across all views
2. Click a bar in the chart → Map zooms to that country
3. Click a bubble in scatter plot → Highlighted everywhere
4. Click a line in parallel coordinates → Focused in all views

### Highlighting System
**Two Types:**
1. **Selected Country** (Cyan): The currently focused country
2. **Filtered Countries** (Blue): Countries matching filter criteria
3. **Other Countries** (Gray/Faded): Not matching filters

### Visual Feedback
- **Hover Effects**: All interactive elements respond to hover
- **Smooth Transitions**: Animations when selecting/filtering
- **Consistent Colors**: Same color scheme across all views

## 📋 Visualization Tasks

### T1: Accessibility Analysis
**Question:** What are the most accessible countries for building a data center?

**Tools to Use:**
1. **Transport Infrastructure** (Bar Chart):
   - Road density per 1000 km²
   - Rail density per 1000 km²
   - Airports per million

2. **Climate & Cooling** (Parallel Coordinates):
   - Mean Temperature
   - Water Share
   - Coastline per 1000 km²
   - Population Density

3. **Connectivity** (Scatter Plot):
   - Internet Users per 100
   - Broadband Subscriptions per 100
   - Mobile Subscriptions per 100

### T2: Profitability Analysis
**Question:** What are the most profitable countries for building a data center?

**Tools to Use:**
1. **Economic Indicators** (Parallel Coordinates):
   - GDP per Capita
   - GDP Growth Rate
   - Real GDP (market size)

2. **Workforce Availability** (Parallel Coordinates):
   - Unemployment Rate
   - Youth Unemployment Rate
   - Literacy Rate
   - Population Growth
   - Median Age

### T3: Efficiency Analysis
**Question:** What are the most efficient countries for building a data center?

**Tools to Use:**
1. **Green Energy** (Scatter Plot):
   - X-axis: CO₂ per GDP (efficiency)
   - Y-axis: CO₂ per Capita
   - Size: Fossil Intensity Index

2. **Power Supply** (Parallel Coordinates):
   - Electricity Access %
   - Electricity Capacity per Capita
   - CO₂ per Capita
   - CO₂ per GDP

**Trade-offs to Explore:**
- High capacity + High CO₂ = Powerful but dirty
- High capacity + Low CO₂ = Ideal
- Low capacity + Low CO₂ = Green but limited

## 💡 Tips & Tricks

### Finding Ideal Locations
1. **Start with Filters**: Narrow down to countries meeting basic criteria
2. **Use Parallel Coordinates**: Compare multiple factors simultaneously
3. **Check Scatter Plot**: Look for clusters of good performers
4. **Verify on Map**: Check geographic location and neighbors
5. **Review Details**: Click country to see full metrics

### Comparing Countries
1. Select first country by clicking
2. Note its position in all visualizations
3. Click another country to compare
4. Use parallel coordinates to see differences across all metrics

### Identifying Trade-offs
1. Use scatter plot with relevant axes
2. Look for countries in different quadrants
3. Adjust bubble size to add third dimension
4. Click outliers to investigate further

### Filtering Strategies
1. **Broad First**: Start with wide ranges
2. **Narrow Down**: Tighten filters based on requirements
3. **Check Count**: Watch "Filtered Results" stat card
4. **Reset if Needed**: Use reset button to start over

## 🔧 Technical Details

### Data Source
- **Primary**: CIA_finaldata.csv (212 countries)
- **Attributes**: 30+ metrics per country
- **Update Frequency**: Static dataset (CIA World Factbook)

### Performance
- **Map Loading**: GeoJSON loaded asynchronously
- **Filtering**: Real-time, no lag
- **Interactions**: Smooth 60fps animations
- **Data Size**: ~200 countries, optimized rendering

### Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile: Responsive design

## 🐛 Troubleshooting

### Map Not Loading
- Check internet connection (GeoJSON loaded from CDN)
- Wait for "Loading map data..." to complete
- Refresh page if stuck

### Country Not Selectable
- Some countries may not have coordinates
- Check console for warnings
- Try clicking the country name in charts instead

### Filters Not Working
- Click "Reset" button to clear
- Check if any countries match criteria
- Adjust ranges to be more inclusive

### Performance Issues
- Close other browser tabs
- Disable browser extensions
- Use Chrome for best performance

## 📚 Data Dictionary

### Economic Metrics
- **Real_GDP_PPP_billion_USD**: Total economic output
- **Real_GDP_per_Capita_USD**: Economic output per person
- **Real_GDP_Growth_Rate_percent**: Annual growth rate
- **Unemployment_Rate_percent**: Overall unemployment
- **Youth_Unemployment_Rate_percent**: Youth (15-24) unemployment

### Energy Metrics
- **electricity_access_percent**: % with electricity access
- **electricity_capacity_per_capita**: Generation capacity per person (kW)

### Connectivity Metrics
- **internet_users_per_100**: Internet users per 100 people
- **broadband_subs_per_100**: Fixed broadband per 100 people
- **mobile_subs_per_100**: Mobile subscriptions per 100 (can exceed 100)

### Infrastructure Metrics
- **road_density_per_1000km2**: Road length per 1000 km² of land
- **rail_density_per_1000km2**: Railway length per 1000 km²
- **airports_per_million**: Airports per million inhabitants

### Environmental Metrics
- **co2_per_capita_tonnes**: CO₂ emissions per person (tonnes)
- **co2_per_gdp_tonnes_per_billion**: CO₂ per billion USD GDP
- **fossil_intensity_index**: Composite fossil fuel dependence score

### Geographic Metrics
- **Mean_Temp**: Average annual temperature (°C)
- **water_share**: Fraction of territory covered by water
- **coastline_per_1000km2**: Coastline length per 1000 km² land

## 🎓 Learning Resources

### Understanding Parallel Coordinates
- Each vertical axis represents one attribute
- Each line represents one country
- Line patterns show relationships
- Crossing lines indicate inverse correlations

### Reading Scatter Plots
- Position shows two attributes
- Bubble size shows third attribute
- Clusters indicate similar countries
- Outliers are interesting cases

### Interpreting Colors
- **Cyan/Bright Blue**: Selected/Active
- **Blue**: Highlighted/Filtered
- **Gray**: Not selected/filtered
- **Color Gradients on Map**: Metric values (darker = higher)

## 🚀 Advanced Usage

### Multi-Country Comparison
1. Use filters to create a shortlist
2. Note the highlighted countries
3. Compare them in parallel coordinates
4. Check scatter plot for relationships
5. Click each to see details

### Task-Specific Workflows

**For Accessibility:**
```
1. Filter: Temperature 0-20°C
2. Add to PCP: Road Density, Rail Density, Airports
3. Add to PCP: Internet Users, Broadband
4. Look for countries with high values across all
5. Click top performers to verify on map
```

**For Profitability:**
```
1. Filter: GDP per Capita > $20,000
2. Add to PCP: GDP Growth, Unemployment, Literacy
3. Scatter: X=GDP Growth, Y=Unemployment, Size=GDP
4. Look for high growth + low unemployment
5. Verify workforce availability
```

**For Efficiency:**
```
1. Scatter: X=CO₂ per GDP, Y=Electricity Capacity
2. Look for low CO₂ + high capacity (top-left)
3. Add to PCP: CO₂ per Capita, Fossil Intensity
4. Filter out high fossil intensity
5. Select greenest options
```

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review IMPLEMENTATION_SUMMARY.md
3. Check browser console for errors
4. Verify data file is loaded correctly

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Data Source**: CIA World Factbook via CIA_finaldata.csv
