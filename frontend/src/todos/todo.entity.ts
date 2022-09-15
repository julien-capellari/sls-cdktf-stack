import { $entity, $store } from '@jujulego/aegis';

import { $api } from '../api';

// Types
export interface Todo {
  id: string;
  name: string;
  done: boolean;
}

// Entity
const Todos = $entity('Todo', $store.memory(), (todo: Todo) => todo.id);

// Api calls
export const findAllTodos = Todos.$list.query($api.get`/todos`);
