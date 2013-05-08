# Warning

This module is a component of [the iai framework](https://npmjs.org/search?q=iai). It's useless for you, until some serious work has been done.

----------------
# Iai Component

Provides an API that helps building and managing modular components for [iai](https://github.com/laconbass/iai).

Iai components must be designed according to the following **Principles**

  * **modularity**: A Iai Component may be divided onto sub-components and so on. Those components may be Iai Components or not.
  * **laziness**: A Iai Component shouldn't load neither of its sub-components until it is loaded explicity.
  * **extensibility**: A Iai Component must extend itself with the funcionality exposed by a loaded sub-component and also provide extension hooks to allow being programatically extended.
