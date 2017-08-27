

# TODO

[X] Create git
[ ] Create github repo?
[X] Allow constraints on dragging, and be able to apply constraints mid-drag
    - types of constraints: 
        + grid
        + axis (not just x and y but along any given line/direction for example to keep aspect ratio)
        + block off certain areas (e.g., not allow position of scale to be less than position of pos)
[X] Clean code up, remove as unneccesary
[X] applyCallback should be able to take multiple callbacks as arguments. It should just concat it's argument list with callback list.
[X] Handles should not only have a callback but also a function to reposition itself in response to other handles changing up the values
    - updateHandles could be a part of every callback?
    - updateHandles calls the update function for every handle?

[X] Create rotation handle, this handle could have its own handle for rotation that appears when the mouse is close in distance (2x où 3x the radius)
[X] Mask entities in panel
[X] Select only 1 entity at once, hide handles
[X] Delete selected entity
[ ] Select multiple entities
[ ] Move multiple selected entities
[ ] Delete multiple selected entities

[X] FONT!

[X] Give each entity ID
[X] Store entities in array/object

[X] Make it so that handles can be relative to relative handles!

[X] Create Panel Entity
[ ] Create Caption Entity
[X] Create SpeechBubble Entity
    [ ] Height based off `<p>`?
[X] Create Person/Reader Entity
    [X] Torso
        [X] Shadow
    [X] Head
        [X] Shadow
        [X] use `<use>` for head shape (mask & light & head)! 
    [X] Eyes
        [X] Fix masking for eyes
    [X] Limbs
    [X] Grainy shadows
    [ ] Scaling
    [X] Create better default position for character (XD)
    [ ] Shirt Logo
    [ ] Mouth

[ ] Allow entity to be masked by MULTIPLE panels
[ ] if masked by multiple panels, highlight panels when entity selected

[X] Mass panel mask (captions subtract from panels, panels could subtract from panels? etc. basically allow shape of panels to change. This is kinda complicated but cool :P you PROBABLY won't regret it. It will also probably fix the problem of entities overlapping the inner border [or just create a worse problem of overlapping the whole border... oops.])

[ ] create border around page size
    - HOW WILL RESCALE MOBILEELELE?

- HOW WILL HANDLE MULTIPLE FONT SIZESS SDSAS?>D?ASF>??

[ ] create multiple pages, switch between
    
[X] Create keyboard shortcuts to create each entity rather than spending time developing user interface

[X] Create inspector, certain entities may have textual/select options better fit for an inspector (although textual options could be through contenteditable, I thnk it would be better just to put it in the inspector)

[X] Create UI showing layers in current panel? possibly using keyboard shortcuts instead of UI actions to move and select different objects. ~~Shows layers in panel which contains mouse.~~ Shows layers in panel with currently selected object

[ ] Saving / Loading

[X] Zoom in/out
[X] Pan w/ cmd+drag?

