# Warning

This module is a component of [the iai framework](https://npmjs.org/search?q=iai). It's useless for you, until some serious work has been done.

----------------

# iai Component

Provides an API that helps building and managing modular components for 
[iai](https://github.com/laconbass/iai).

iai components must be designed according to the following **Principles**

  * **modularity**: An iai Component may be divided onto sub-components and so on. Those components may be iai Components or not.
  * **laziness**: An iai Component shouldn't load neither of its sub-components until it is loaded explicity.
  * **extensibility**: An iai Component must extend itself with the funcionality exposed by a loaded sub-component and also provide extension hooks to allow being programatically extended.
