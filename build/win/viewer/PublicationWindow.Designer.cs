﻿namespace Viewer
{
    partial class PublicationWindow
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.view = new System.Windows.Forms.WebBrowser();
            this.menuStrip1 = new System.Windows.Forms.MenuStrip();
            this.goToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.firstPageToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.lastPageToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.previousPageToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.nextPageToolStripMenuItem = new System.Windows.Forms.ToolStripMenuItem();
            this.menuStrip1.SuspendLayout();
            this.SuspendLayout();
            // 
            // view
            // 
            this.view.Dock = System.Windows.Forms.DockStyle.Fill;
            this.view.Location = new System.Drawing.Point(0, 0);
            this.view.Margin = new System.Windows.Forms.Padding(0);
            this.view.MinimumSize = new System.Drawing.Size(200, 200);
            this.view.Name = "view";
            this.view.Size = new System.Drawing.Size(1222, 830);
            this.view.TabIndex = 0;
            // 
            // menuStrip1
            // 
            this.menuStrip1.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.goToolStripMenuItem});
            this.menuStrip1.Location = new System.Drawing.Point(0, 0);
            this.menuStrip1.Name = "menuStrip1";
            this.menuStrip1.Size = new System.Drawing.Size(1222, 40);
            this.menuStrip1.TabIndex = 1;
            this.menuStrip1.Text = "menuStrip1";
            this.menuStrip1.Visible = false;
            // 
            // goToolStripMenuItem
            // 
            this.goToolStripMenuItem.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.firstPageToolStripMenuItem,
            this.lastPageToolStripMenuItem,
            this.previousPageToolStripMenuItem,
            this.nextPageToolStripMenuItem});
            this.goToolStripMenuItem.Name = "goToolStripMenuItem";
            this.goToolStripMenuItem.Size = new System.Drawing.Size(57, 36);
            this.goToolStripMenuItem.Text = "&Go";
            // 
            // firstPageToolStripMenuItem
            // 
            this.firstPageToolStripMenuItem.Name = "firstPageToolStripMenuItem";
            this.firstPageToolStripMenuItem.Size = new System.Drawing.Size(240, 36);
            this.firstPageToolStripMenuItem.Text = "First page";
            this.firstPageToolStripMenuItem.Click += new System.EventHandler(this.GoFirstPage_Click);
            // 
            // lastPageToolStripMenuItem
            // 
            this.lastPageToolStripMenuItem.Name = "lastPageToolStripMenuItem";
            this.lastPageToolStripMenuItem.Size = new System.Drawing.Size(240, 36);
            this.lastPageToolStripMenuItem.Text = "Last page";
            this.lastPageToolStripMenuItem.Click += new System.EventHandler(this.GoLastPage_Click);
            // 
            // previousPageToolStripMenuItem
            // 
            this.previousPageToolStripMenuItem.Name = "previousPageToolStripMenuItem";
            this.previousPageToolStripMenuItem.Size = new System.Drawing.Size(240, 36);
            this.previousPageToolStripMenuItem.Text = "Previous page";
            this.previousPageToolStripMenuItem.Click += new System.EventHandler(this.GoPreviousPage_Click);
            // 
            // nextPageToolStripMenuItem
            // 
            this.nextPageToolStripMenuItem.Name = "nextPageToolStripMenuItem";
            this.nextPageToolStripMenuItem.Size = new System.Drawing.Size(240, 36);
            this.nextPageToolStripMenuItem.Text = "Next page";
            this.nextPageToolStripMenuItem.Click += new System.EventHandler(this.GoNextPage_Click);
            // 
            // PublicationForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(12F, 25F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(1222, 830);
            this.Controls.Add(this.view);
            this.Controls.Add(this.menuStrip1);
            this.MainMenuStrip = this.menuStrip1;
            this.Name = "PublicationForm";
            this.Text = "Publication";
            this.WindowState = System.Windows.Forms.FormWindowState.Maximized;
            this.menuStrip1.ResumeLayout(false);
            this.menuStrip1.PerformLayout();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.WebBrowser view;
        private System.Windows.Forms.MenuStrip menuStrip1;
        private System.Windows.Forms.ToolStripMenuItem goToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem firstPageToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem lastPageToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem previousPageToolStripMenuItem;
        private System.Windows.Forms.ToolStripMenuItem nextPageToolStripMenuItem;
    }
}