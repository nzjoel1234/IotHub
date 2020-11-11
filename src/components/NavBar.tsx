/* eslint-disable jsx-a11y/anchor-is-valid */
import * as React from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';

export const NavBar = () => {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <nav className="navbar is-dark" role="navigation" aria-label="main navigation">
      <div className="navbar-brand">
        <a className="navbar-item" href="/">
          <img src="/logo512.png" style={{ filter: 'invert(1)' }} height="28" alt="brand" />
          &nbsp;
          IOT Hub
        </a>
        <a
          className={classNames("navbar-burger burger", { 'is-active': expanded })}
          onClick={() => setExpanded(e => !e)}
          aria-label="menu"
          aria-expanded="false"
          data-target="navbarBasicExample"
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>
      <div id="navbarBasicExample" className={classNames("navbar-menu", { 'is-active': expanded })}>
        <div className="navbar-end">
          <div className="navbar-item">
            <div className="buttons">
              <Link to="/logout" className="button is-dark">
                <strong>Logout</strong>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;