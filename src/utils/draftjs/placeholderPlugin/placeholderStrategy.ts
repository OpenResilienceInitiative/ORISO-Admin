const placeholderStrategy = (contentBlock, callback, contentState) => {
    contentBlock.findEntityRanges((character) => {
        const entityKey = character.getEntity();
        return entityKey !== null && contentState.getEntity(entityKey).getType() === 'PLACEHOLDER';
    }, callback);
};

export default placeholderStrategy;
