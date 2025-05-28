import React from 'react';

function LetterAvatar({ name, size = '48px', textSize = '20px', backgroundColor }) {
  // Extract first letter and uppercase it
  const letter = name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  
  // Generate a consistent color based on the name if not provided
  const getBackgroundColor = () => {
    if (backgroundColor) return backgroundColor;
    
    // Simple hash function to generate color based on name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate HSL color with good contrast
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };
  
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: getBackgroundColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: textSize,
        fontWeight: 'bold',
        userSelect: 'none',
      }}
    >
      {letter}
    </div>
  );
}

export default LetterAvatar; 