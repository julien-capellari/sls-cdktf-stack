import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { FC } from 'react';

import { findAllTodos, Todo } from './todo.entity';
import { $hook } from '@jujulego/aegis-react';

// Constants
const COLUMNS: GridColDef<Todo>[] = [
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'done', headerName: 'Status', flex: 1 }
];

// Hooks
const useTodos = $hook.list(findAllTodos);

// Component
export const TodosTable: FC = () => {
  const todos = useTodos('all');

  // Render
  return (
    <DataGrid columns={COLUMNS} rows={todos.data} />
  );
}
