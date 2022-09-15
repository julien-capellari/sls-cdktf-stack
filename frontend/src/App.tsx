import React from 'react';
import { Box, Typography } from '@mui/material';

import { TodosTable } from './todos/TodosTable';

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', p: 4 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Todos
      </Typography>
      <Box sx={{ flex: 1 }}>
        <TodosTable />
      </Box>
    </Box>
  );
}

export default App;
