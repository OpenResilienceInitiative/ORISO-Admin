import React from 'react';
import { Link } from 'react-router-dom';
import PublicPageLayoutWrapper from '../components/Layout/PublicPageLayoutWrapper';

export const Error404 = () => {
    return (
        <PublicPageLayoutWrapper>
            <div className="error404">
                <h1 className="head-404">404</h1>
                <h5>Die Web-Adresse, die Sie eingegeben haben, gibt es auf unserer Website nicht.</h5>

                <Link to="/">Zur Startseite</Link>
            </div>
        </PublicPageLayoutWrapper>
    );
};
