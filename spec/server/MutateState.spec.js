
const { MutableState } = require('../../src/server/MutableState');

function linkStates(state) {
	let linked = new MutableState(state);

	state.on('mutate', function(update) { linked.mutate(update) });

	return linked;
}

describe('MutableState', function () {
	
	it('can init from null', function () {
		let state = new MutableState();

		expect(state.id).toBeDefined();
		expect(state.name).toBeDefined();
		expect(state.state).toBeDefined();
		expect(state.status).toEqual('new');
	});

	it('can init from id and name', function () {
		let state = new MutableState({id:1, name:'state'});

		expect(state.id).toEqual(1);
		expect(state.name).toEqual('state');
	});

	it('can init from other state', function () {
		let state = new MutableState({id:1, name:'state'});

		state.mutateState('hello','world')

		let copy = new MutableState(state);

		expect(copy.id).toEqual(1);
		expect(copy.name).toEqual('state');
		expect(copy.state['hello']).toEqual('world');
	});

	it('mutateState can be used to link state ', function () {
		let state = new MutableState({id:1, name:'state'});

		let linked = linkStates(state);

		state.mutateState('hello','world')

		expect(linked.state['hello']).toEqual('world');
	});

	it('mutateStatus can be used to link state ', function () {
		let state = new MutableState({id:1, name:'state'});

		let linked = linkStates(state);

		state.mutateStatus('running')

		expect(linked.status).toEqual('running');
	});

	it('mutateUsage can be used to link state ', function () {
		let state = new MutableState({id:1, name:'state'});

		let linked = linkStates(state);

		state.mutateUsage({cpu:1,memory:0})

		expect(linked.usage.cpu).toEqual(1);
		expect(linked.usage.memory).toEqual(0);
	});

	it('mutateData can be used to link state ', function () {
		let state = new MutableState({id:1, name:'state'});

		let linked = linkStates(state);

		state.mutateData('collection',1)
		state.mutateData('collection',2)
		state.mutateData('collection',3)

		expect(linked.data.collection.length).toEqual(3);
		expect(linked.data.collection).toEqual([1,2,3]);
	});

	it('mutateDataDelete can be used to link state ', function () {
		let state = new MutableState({id:1, name:'state'});

		let linked = linkStates(state);

		state.mutateData('collection',1)
		state.mutateData('collection',2)
		state.mutateData('collection',3)
		state.mutateDataDelete('collection',2)

		expect(linked.data.collection.length).toEqual(2);
		expect(linked.data.collection).toEqual([1,3]);
	});
});