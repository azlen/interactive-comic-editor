

# TODO

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

[ ] Create rotation handle, this handle could have its own handle for rotation that appears when the mouse is close in distance (2x où 3x the radius)
[ ] Mask entities in panel
[X] Select only 1 entity at once, hide handles
[X] Delete selected entity
[ ] Select multiple entities
[ ] Move multiple selected entities
[ ] Delete multiple selected entities

[X] Make it so that handles can be relative to relative handles!

[X] Create Panel Entity
[ ] Create Caption Entity
[ ] Create SpeechBubble Entity
[ ] Create Person/Reader Entity
    [ ] Torso
    [ ] Head
    [ ] Eyes
    [ ] Limbs

[X] Create keyboard shortcuts to create each entity rather than spending time developing user interface

[ ] Create inspector, certain entities may have textual/select options better fit for an inspector (although textual options could be through contenteditable, I thnk it would be better just to put it in the inspector)

[ ] Create UI showing layers in current panel? possibly using keyboard shortcuts instead of UI actions to move and select different objects. ~~Shows layers in panel which contains mouse.~~ Shows layers in panel with currently selected object

[ ] Saving / Loading

[ ] Zoom in/out
[ ] Pan w/ cmd+drag?

