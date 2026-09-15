export function filterColors(colors, query, family) {
  const q = query.trim().toLowerCase();
  return colors.filter(color => {
    const matchesQuery = q === '' || color.name.toLowerCase().includes(q);
    const matchesFamily = family === 'All' || color.family === family;
    return matchesQuery && matchesFamily;
  });
}
