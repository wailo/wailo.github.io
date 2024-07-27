export interface Theme {
    primaryColor: string;
    borderColor: String;
    secondaryColor: string;
    accentColor: string;
    panelColor: String;
    panelFrame: String;
    panelContentBackground: String;
    backgroundColor: string;
    textColor: String;
    separatorLineColor: String;
    activeButton: String;
}

// src/theme.js
const darkPrimaryColor = '#d4af37'
const darkTheme: Theme = {
    primaryColor: darkPrimaryColor,
    borderColor: darkPrimaryColor,
    secondaryColor: '#d9c175',
    accentColor: '#e3342f',
    panelColor: '#302f2f',
    panelFrame: 'rgb(46,48,51)',
    panelContentBackground: 'rgb(20,20,20)',
    backgroundColor: 'rgb(11,13,17)',
    textColor: '#f8fafc',
    separatorLineColor: '#414242',
    activeButton: 'rgb(92, 200, 60)'
};

const lightTheme: Theme = {
    primaryColor: 'rgb(230, 91,91)',       // Dark brown
    borderColor: '#8d5524',        // Dark brown for borders
    secondaryColor: '#d9cfcf',     // Off-white for secondary elements
    accentColor: '#a0522d',        // Slightly lighter brown accent
    panelColor: '#f5f5f5',         // Off-white for panels
    backgroundColor: 'rgb(31,31,31)',    // Darker brown for background
    textColor: 'rgb(243, 199, 128)',          // Off-white text color
    separatorLineColor: '#8b4513',  // A medium brown for separator lines
    activeButton: 'rgb(92, 200, 60)'
};

const blackAndWhiteTheme: Theme = {
    primaryColor: '#000000',        // Black
    borderColor: '#000000',         // Black
    secondaryColor: '#ffffff',      // Black
    accentColor: '#000000',         // Black
    panelColor: '#f0f0f0',          // Off-white
    panelFrame: '#d0d0d0',          // Light Grey
    panelContentBackground: '#f5f5f5', // White
    backgroundColor: '#f5f5f5',     // White
    textColor: '#000000',           // Black
    separatorLineColor: '#e0e0e0',  // Light Grey
    activeButton: '#ffffff'         // Black
};


export const theme = blackAndWhiteTheme;
