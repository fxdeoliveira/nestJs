import { Injectable, NotFoundException } from '@nestjs/common';
import { Task, TaskStatus } from './task.model';
import { v4 as uuid } from 'uuid';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTaskFilterDto } from './dto/get-task-filter.dto';

@Injectable()
export class TasksService {
    private tasks: Task[] = [];

    getAllTask(): Task[] {
        return this.tasks;
    }

    getTaskWithFilters(filtersDto: GetTaskFilterDto): Task[] {
      const {status, search} = filtersDto; 

      // define a temporary array to hold the result
      let tasks = this.getAllTask();

      //do something with status
      if(status){
        tasks = tasks.filter( (task) => task.status === status);
      }

      //do something with search
      if(search){
        tasks = tasks.filter( (task) => {
          if(task.title.includes(search) || task.description.includes(search)) {
            return true;
          }
          return false;
        });
      }

      // return finaly result
      return tasks
    }

    getTaskByI(id: string): Task {
      const found = this.tasks.find( (task) => task.id === id );

      if(!found){
        throw new NotFoundException(`Task with ID "${id}" not found`);
      }
      return found;
    }

    createTask(createTaskDto: CreateTaskDto): Task {
      const {title, description} = createTaskDto;

      const task: Task = {
        id: uuid(),
        title,
        description,
        status: TaskStatus.OPEN,
      };
  
      this.tasks.push(task);
  
      return task;
    }

    updateTaskStatus(id: string, status: TaskStatus) {
      const task = this.getTaskByI(id);
      task.status = status;
      return task;
    }

    deleteTask(id: string): void{
      this.tasks = this.tasks.filter( (task) => task.id != id);
    }
}
