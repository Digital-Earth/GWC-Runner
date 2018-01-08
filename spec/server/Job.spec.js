
const serverContext = require('../../src/server/ServerContext');
const Job = require('../../src/server/Job');
const ee = require('event-emitter');
const { TaskState } = require('../../src/server/TaskState');

serverContext.cluster = {
	_tasks: {},
	autoStart: false,

	start: function (details, callback) {
		let state = new TaskState(details);
		state.on('start', callback)

		this._tasks[state.id] = state;

		if (this.autoStart) {
			state.mutateStatus('running');
		}
	},
	killTaskById(id) {
		if (id in this._tasks) {
			this._tasks[id].mutateStatus('done');
		}
	},
	hasTaskWithId(id) {
		return id in this._tasks;
	},
	getTaskWithId(id) {
		return this._tasks[id];
	},
	runTaskWithId(id) {
		let task = this._tasks[id];
		task.mutateStatus('running');
		task.mutateStatus('done')
	},
	tasks() {
		return Object.values(this._tasks);
	},
	completeAllTasks() {
		for (task of this.tasks()) {
			if (task.status == 'new') {
				task.mutateStatus('running');
			}
			if (task.status == 'running') {
				task.mutateStatus('done')
			}
		}
	}
}

describe('Job', function () {
	beforeEach(() => {
		serverContext.cluster._tasks = {};
		serverContext.cluster.autoStart = false;
	});

	it('has name', function () {
		let job = new Job('job');

		expect(job.name).toEqual('job');
	});

	it('has no result before run', function () {
		let job = new Job('job');

		expect(job.result).toBeUndefined();

		job.complete(42);

		expect(job.result).toEqual(42);
	});

	it('has and unique id', function () {
		let job = new Job('job');
		expect(job.id).toBeDefined();

		let job2 = new Job('job');

		expect(job.id).not.toEqual(job2.id);
	});

	it('invoke task', function () {
		let job = new Job('job');

		let action = job.invoke({ id: 1 });

		expect(serverContext.cluster.hasTaskWithId(1)).toBeFalsy();

		job.start();

		expect(serverContext.cluster.hasTaskWithId(1)).toBeTruthy();
	});

	it('complete after task is done', function () {
		let job = new Job('job');

		job.invoke({ id: 1 }).complete();

		expect(job.status).toEqual('new');

		job.start();

		expect(job.status).toEqual('running');

		let task = serverContext.cluster.getTaskWithId(1);

		task.mutateStatus('running');

		expect(job.status).not.toEqual('done')

		task.mutateStatus('done');

		expect(job.status).toEqual('done')
	});

	it('invoke can be chained', function () {

		let job = new Job('job');

		job.invoke({ id: 1 }).invoke({ id: 2 }).complete();

		job.start();

		let task1 = serverContext.cluster.getTaskWithId(1);
		let task2 = serverContext.cluster.getTaskWithId(2);

		expect(serverContext.cluster.hasTaskWithId(1)).toBeTruthy();
		expect(serverContext.cluster.hasTaskWithId(2)).toBeFalsy();

		serverContext.cluster.runTaskWithId(1);

		expect(job.status).not.toEqual('done');

		expect(serverContext.cluster.hasTaskWithId(2)).toBeTruthy();
		serverContext.cluster.runTaskWithId(2);

		expect(job.status).toEqual('done');
	});

	it('job can invoke start if job already started', function () {
		let job = new Job('job');

		job.start();

		expect(serverContext.cluster.hasTaskWithId(1)).toBeFalsy();

		job.invoke({ id: 1 }).complete();

		expect(serverContext.cluster.hasTaskWithId(1)).toBeTruthy();

		serverContext.cluster.runTaskWithId(1);

		expect(job.status).toEqual('done');
	});

	it('job result can be changed with then', function () {
		let job = new Job('job');

		job.invoke({ id: 1, state: { value: 42 } }).then(function (result) { return result.state.value + 42 }).complete();

		job.start();

		expect(job.status).not.toEqual('done');

		serverContext.cluster.runTaskWithId(1);

		expect(job.result).toEqual(84);

		expect(job.status).toEqual('done');
	});

	it('job can invoke custom action using then', function () {
		let job = new Job('job');

		job.invoke({ id: 100 }).then(result => job.invoke({ id: 12, state: { value: result.id + 1 } })).complete();

		job.start();

		expect(serverContext.cluster.hasTaskWithId(100)).toBeTruthy();
		expect(serverContext.cluster.hasTaskWithId(12)).toBeFalsy();

		serverContext.cluster.runTaskWithId(100);

		expect(serverContext.cluster.hasTaskWithId(12)).toBeTruthy();
		expect(job.status).not.toEqual('done');

		serverContext.cluster.runTaskWithId(12);

		expect(job.status).toEqual('done')
	});

	it('job action.then can return null', function() {
		let job = new Job('job');

		job.invoke(function() {}).complete();

		job.start();

		expect(job.result).toBeUndefined();
	})

	it('keep alive start new tasks if task is terminated', function () {
		let job = new Job('job');

		let action = job.keepAlive({ name: 'keep-alive' });

		job.start();

		expect(action.task).not.toBeDefined();

		let firstTask = serverContext.cluster.tasks()[0];

		firstTask.mutateStatus('running');

		expect(action.task).toBeDefined();

		firstTask.mutateStatus('done');

		let secondTask = serverContext.cluster.tasks()[1];

		secondTask.mutateStatus('running');

		expect(action.task.id).not.toEqual(firstTask.id);

		job.kill();

		expect(action.task).not.toBeDefined();
	});

	it('keep alive stop starting new tasks after job been terminated', function () {
		let job = new Job('job');


		serverContext.cluster.autoStart = true;

		job.keepAlive({});

		expect(serverContext.cluster.tasks().length).toEqual(0);

		job.start();

		serverContext.cluster.completeAllTasks();
		serverContext.cluster.completeAllTasks();
		serverContext.cluster.completeAllTasks();

		expect(serverContext.cluster.tasks().length).toEqual(4);

		job.kill();

		expect(serverContext.cluster.tasks().length).toEqual(4);
	});

	it('keep alive stop starting new tasks after job been terminated', function () {
		let job = new Job('job');
		serverContext.cluster.autoStart = true;

		let count = 0;
		job.keepAlive({}, {
			while: function(result) {
				count++;
				return count<4;
			}
		}).complete();

		job.start();

		serverContext.cluster.completeAllTasks();
		expect(count).toEqual(1);
		serverContext.cluster.completeAllTasks();
		expect(count).toEqual(2);
		serverContext.cluster.completeAllTasks();
		expect(job.status).not.toEqual('done');

		serverContext.cluster.completeAllTasks();
		expect(job.status).toEqual('done');
	});

	it('multiple invoke happen in parallel', function() {
		let job = new Job('job');

		job.invoke({id:1});
		job.invoke({id:2});

		job.start();

		expect(serverContext.cluster.hasTaskWithId(1)).toBeTruthy();
		expect(serverContext.cluster.hasTaskWithId(2)).toBeTruthy();

	});

	it('job.whenAll waits for all tasks to complete', function() {
		let job = new Job('job');

		let a1 = job.invoke({id:1});
		let a2 = job.invoke({id:2});

		job.start();	
		job.whenAll(a1,a2).complete();

		serverContext.cluster.runTaskWithId(1);

		expect(job.status).not.toEqual('done');

		serverContext.cluster.runTaskWithId(2);

		expect(job.status).toEqual('done');

		expect(job.result.length).toEqual(2);
		expect(job.result[0].id).toEqual(1);
	});

	it('job.whenFirst waits for the first task to complete', function() {
		let job = new Job('job');

		let a1 = job.invoke({id:1});
		let a2 = job.invoke({id:2});

		job.start();

		let first = job.whenFirst(a1,a2).complete();

		expect(job.status).not.toEqual('done');

		serverContext.cluster.runTaskWithId(2);

		expect(job.status).toEqual('done');

		expect(job.result.id).toEqual(2);
	});

	it('job.whenFirst return immediately if on of the actions already completed', function() {
		let job = new Job('job');

		let a1 = job.invoke({id:1});
		let a2 = job.invoke({id:2});

		job.start();

		serverContext.cluster.runTaskWithId(2);

		let first = job.whenFirst(a1,a2).complete();

		expect(job.status).toEqual('done');

		expect(job.result.id).toEqual(2);
	});
});