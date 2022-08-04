import { Reaction } from 'mobx';
import { intercept } from 'preactive';

// === exports =======================================================

export { makeComponentsMobxAware };

// === makeComponentsMobxAware =======================================

function makeComponentsMobxAware() {
  const reactionsById: Record<string, Reaction> = {};

  intercept({
    onInit(next, getCtrl) {
      const ctrl = getCtrl();
      const update = ctrl.getUpdater();
      const id = ctrl.getId();

      let reaction = reactionsById[id];

      if (!reaction) {
        reaction = new Reaction('reaction', () => {
          update();
        });

        reactionsById[id] = reaction;
      }

      next();
      //reaction.track(next);
    },

    onRender(next, id) {
      reactionsById[id].track(next);
    }
  });
}
